import { dev } from '$app/environment';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import * as auth from '$lib/server/oidc';
import { error, type Handle } from '@sveltejs/kit';
import { parse, type CookieSerializeOptions } from 'cookie';
import type { BaseUser } from './types/app';
import type { ReqValidateSSOResponse } from './types/auth';
import { computeRolesFromCookies, computeRolesFromJWT } from './utilities/auth';
import { reqGatewayForwardCookies } from './utilities/requests';

export const handle: Handle = async ({ event, resolve }) => {
  // Ignore Chrome DevTools requests to prevent noisy 404 logs
  // See https://svelte.dev/docs/cli/devtools-json#Alternatives
  if (event.url.pathname.startsWith('/.well-known/appspecific/com.chrome.')) {
    return new Response(null, { status: 404 });
  }
  if (event.url.pathname.includes('error') || event.url.pathname.includes('oidc')) {
    // don't want hooks running on an error page
    return await resolve(event);
  }
  if (
    env.PUBLIC_AUTH_OIDC_ENABLED === 'true' &&
    !event.url.pathname.includes('changeRole') &&
    event.url.pathname.includes('auth')
  ) {
    error(
      500,
      `Attempting to access /auth endpoint "${event.url.pathname}" while OIDC enabled (env.PUBLIC_AUTH_OIDC_ENABLED='true').`,
    );
  }

  try {
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
      return await handleOIDCAuth({ event, resolve });
    } else if (env.PUBLIC_AUTH_SSO_ENABLED === 'true') {
      return await handleSSOAuth({ event, resolve });
    } else {
      return await handleJWTAuth({ event, resolve });
    }
  } catch (e) {
    event.locals.user = null;
  }

  return await resolve(event);
};

/**
 * Sets local user to the decoded access token enriched with additional
 * fine-grained query-related permissions.
 */
const handleOIDCAuth: Handle = async ({ event, resolve }) => {
  event = await auth.handler(event);

  // the above handler doesn't impact the event.request.headers, but it does
  // impact the cookies object. we only gain information by using that...
  // so let's use it!
  const activeRole = event.cookies.get('activeRole') ?? null;
  const token = event.cookies.get('accessToken');

  if (token) {
    const user: BaseUser = { id: null, token };
    event.locals.user = await computeRolesFromJWT(user, activeRole);

    // If the active role cookie is not in the list of allowed roles, then set
    // it to the user's default role.
    if (event.locals.user && !event.locals.user.allowedRoles.includes(activeRole || '')) {
      event.cookies.set('activeRole', event.locals.user.defaultRole, {
        httpOnly: false,
        path: `${base}/`,
        sameSite: 'lax',
        secure: !dev,
      });
    }
  } else {
    event.locals.user = null;
  }

  return await resolve(event);
};

const handleJWTAuth: Handle = async ({ event, resolve }) => {
  const activeRoleHeader = event.request.headers.get('Active-Role');
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookies = parse(cookieHeader);
  const { activeRole: activeRoleCookie = null, user: userCookie } = cookies;

  // try to get role with current JWT
  if (userCookie) {
    const user = await computeRolesFromCookies(userCookie, activeRoleHeader ?? activeRoleCookie);
    if (user) {
      event.locals.user = user;
      return await resolve(event);
    }
  } else {
    event.locals.user = null;
  }

  // if we're already on the login page, don't redirect
  // otherwise we get stuck in a redirect loop
  if (event.url.pathname.includes('/login') || event.url.pathname.includes('/auth')) {
    return await resolve(event);
  }

  // Capture the original URL to redirect back after login
  const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
  return new Response(null, {
    headers: {
      location: `${base}/login?redirectTo=${redirectTo}`,
    },
    status: 307,
  });
};

const handleSSOAuth: Handle = async ({ event, resolve }) => {
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookies = parse(cookieHeader);
  const { activeRole: activeRoleCookie = null } = cookies;
  const activeRoleHeader = event.request.headers.get('Active-Role');
  const activeRole = activeRoleHeader ?? activeRoleCookie;

  // pass all cookies to the gateway, who can determine if we have any valid SSO tokens
  const validationData = await reqGatewayForwardCookies<ReqValidateSSOResponse>(
    '/auth/validateSSO',
    cookieHeader,
    event.url.toString(),
  );

  if (!validationData.success) {
    return new Response(null, {
      headers: {
        // redirectURL field from gateway response will contain our login UI URL
        location: `${validationData.redirectURL}`,
      },
      status: 307,
    });
  }

  // otherwise, we had a valid SSO token, so compute roles from returned JWT
  // note, this sets a new JWT cookie each time
  const user: BaseUser = {
    id: validationData.userId ?? '',
    token: validationData.token ?? '',
  };

  const roles = await computeRolesFromJWT(user, activeRole);

  // create and set activeRole cookie
  if (roles) {
    const cookieOpts: CookieSerializeOptions & { path: string } = {
      httpOnly: false,
      path: `${base}/`,
      sameSite: 'none',
      secure: !dev,
    };

    // don't overwrite existing activeRole, unless it doesn't exist anymore
    if (!activeRoleCookie || activeRoleCookie === 'deleted' || !roles.allowedRoles.includes(activeRoleCookie)) {
      event.cookies.set('activeRole', roles.defaultRole, cookieOpts);
    }
  }

  event.locals.user = roles;

  return await resolve(event);
};
