import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import * as auth from '$lib/server/oidc';
import { isHttpError, redirect, type Handle, type Redirect } from '@sveltejs/kit';
import { parse, type CookieSerializeOptions } from 'cookie';
import type { BaseUser } from './types/app';
import type { ReqValidateSSOResponse } from './types/auth';
import { computeRolesFromCookies, computeRolesFromJWT } from './utilities/auth';
import { reqGatewayForwardCookies } from './utilities/requests';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.includes('com.chrome.devtools')) {
    return new Response(null, { status: 204 });
  }
  if (event.url.pathname.includes('error') || event.url.pathname.includes('oidc')) {
    // don't want hooks running on an error page
    return await resolve(event);
  }

  try {
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
      // separate try catch because we don't want to change hooks' behavior for other auth methods. but necessary here.
      try {
        return await handleOIDCAuth({ event, resolve });
      } catch (e: unknown) {
        if (e instanceof Error) {
          const code = 500;
          const message = encodeURI(`${e.message}`);
          throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
        } else if (isHttpError(e)) {
          const code = e.status;
          const message = encodeURI(`${JSON.stringify(e.body)}`);
          throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
        } else {
          const code = 500;
          const message = encodeURI(`Unknown Server Error`);
          throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
        }
      }
    } else if (env.PUBLIC_AUTH_SSO_ENABLED === 'true') {
      return await handleSSOAuth({ event, resolve });
    } else {
      return await handleJWTAuth({ event, resolve });
    }
  } catch (e) {
    // the redirect thrown gets caught here, so we need to make sure it REALLY throws
    if ((e as Redirect).status === 303) {
      return redirect(303, (e as Redirect).location);
    } else {
      event.locals.user = null;
    }
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

  // create and set activeRole cookie
  if (roles) {
    const cookieOpts: CookieSerializeOptions & { path: string } = {
      httpOnly: false,
      path: `${base}/`,
      sameSite: 'none',
    };

    // don't overwrite existing activeRole, unless it doesn't exist anymore
    if (!activeRoleCookie || activeRoleCookie === 'deleted' || !roles.allowedRoles.includes(activeRoleCookie)) {
      event.cookies.set('activeRole', roles.defaultRole, cookieOpts);
    }
  }

  event.locals.user = roles;

  return await resolve(event);
};
