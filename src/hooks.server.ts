import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import * as auth from '$lib/server/oidc';
import type { Handle } from '@sveltejs/kit';
import { parse, type CookieSerializeOptions } from 'cookie';
import type { BaseUser } from './types/app';
import type { ReqValidateSSOResponse } from './types/auth';
import { computeRolesFromCookies, computeRolesFromJWT } from './utilities/auth';
import { reqGatewayForwardCookies } from './utilities/requests';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.includes('com.chrome.devtools')) {
    return new Response(null, { status: 204 });
  }

  try {
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
      await auth.handler(event);
      return await handleOIDCAuth({ event, resolve });
    } else if (env.PUBLIC_AUTH_SSO_ENABLED === 'true') {
      return await handleSSOAuth({ event, resolve });
    } else {
      return await handleJWTAuth({ event, resolve });
    }
  } catch (e) {
    console.log(e);
    event.locals.user = null;
  }

  return await resolve(event);
};

/**
 * Sets local user to the decoded access token enriched with additional
 * fine-grained query-related permissions.
 */
const handleOIDCAuth: Handle = async ({ event, resolve }) => {
  const cookies = parse(event.request.headers.get('cookie') ?? '');
  const { activeRole, accessToken: token = null } = cookies;

  if (token) {
    const user: BaseUser = { id: null, token };
    event.locals.user = await computeRolesFromJWT(user, activeRole);

    const cookieHeader = event.request.headers.get('cookie') ?? '';
    const cookies = parse(cookieHeader);
    const { activeRole: activeRoleCookie = null } = cookies;
    if (
      event.locals.user &&
      (!activeRoleCookie ||
        activeRoleCookie === 'deleted' ||
        !event.locals.user.allowedRoles.includes(activeRoleCookie))
    ) {
      event.cookies.set('activeRole', event.locals.user.defaultRole, {
        httpOnly: false,
        path: `${base}/`,
      });
    }
  } else {
    event.locals.user = null;
  }

  return await resolve(event);
};

const handleJWTAuth: Handle = async ({ event, resolve }) => {
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookies = parse(cookieHeader);
  const { activeRole: activeRoleCookie = null, user: userCookie } = cookies;

  // try to get role with current JWT
  if (userCookie) {
    const user = await computeRolesFromCookies(userCookie, activeRoleCookie);
    if (user) {
      event.locals.user = user;
      return await resolve(event);
    }
  } else {
    event.locals.user = null;
  }

  // if we're already on the login page, don't redirect
  // otherwise we get stuck in a redirect loop
  return event.url.pathname.includes('/login') || event.url.pathname.includes('/auth')
    ? await resolve(event)
    : new Response(null, {
        headers: {
          location: `${base}/login`,
        },
        status: 307,
      });
};

const handleSSOAuth: Handle = async ({ event, resolve }) => {
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookies = parse(cookieHeader);
  const { activeRole: activeRoleCookie = null } = cookies;

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

  const roles = await computeRolesFromJWT(user, activeRoleCookie);

  if (roles) {
    // create and set cookies
    const userStr = JSON.stringify(user);
    const userCookie = Buffer.from(userStr).toString('base64');
    const cookieOpts: CookieSerializeOptions & { path: string } = {
      httpOnly: false,
      path: `${base}/`,
      sameSite: 'none',
    };

    // if logout just cleared user cookie, don't re-set it
    if (!event.url.pathname.includes('/auth/logout')) {
      event.cookies.set('user', userCookie, cookieOpts);
    }

    // don't overwrite existing activeRole, unless it doesn't exist anymore
    if (!activeRoleCookie || activeRoleCookie === 'deleted' || !roles.allowedRoles.includes(activeRoleCookie)) {
      event.cookies.set('activeRole', roles.defaultRole, cookieOpts);
    }
  }

  event.locals.user = roles;

  return await resolve(event);
};
