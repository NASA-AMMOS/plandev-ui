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

/**
 * Build Content Security Policy directives.
 * CSP helps prevent XSS attacks by restricting where scripts/resources can be loaded from.
 */
function buildCSPDirectives(): string {
  // Extract hostnames from URLs for connect-src
  const connectSources = [
    "'self'",
    env.PUBLIC_HASURA_CLIENT_URL,
    env.PUBLIC_HASURA_WEB_SOCKET_URL,
    env.PUBLIC_GATEWAY_CLIENT_URL,
    env.PUBLIC_ACTION_CLIENT_URL,
    env.PUBLIC_WORKSPACE_CLIENT_URL,
  ].filter(Boolean);

  return [
    "default-src 'self'",
    // 'unsafe-inline' needed for Svelte's scoped styles and Monaco editor
    // 'unsafe-eval' needed for Monaco editor's syntax highlighting
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Workers needed for Monaco editor
    "worker-src 'self' blob:",
    `connect-src ${connectSources.join(' ')}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

/**
 * Add security headers to response.
 * Uses Report-Only mode initially to gather violations without breaking functionality.
 * Change to 'Content-Security-Policy' to enforce after testing.
 */
function addSecurityHeaders(response: Response): Response {
  const csp = buildCSPDirectives();

  // Use Report-Only mode to monitor violations without blocking
  // Change to 'Content-Security-Policy' to enforce after testing
  response.headers.set('Content-Security-Policy-Report-Only', csp);

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Ignore Chrome DevTools requests to prevent noisy 404 logs
  // See https://svelte.dev/docs/cli/devtools-json#Alternatives
  if (event.url.pathname.startsWith('/.well-known/appspecific/com.chrome.')) {
    return new Response(null, { status: 404 });
  }
  if (event.url.pathname.startsWith(`${base}/error`) || event.url.pathname.startsWith(`${base}/oidc`)) {
    // don't want hooks running on an error page
    const response = await resolve(event);
    return addSecurityHeaders(response);
  }
  if (
    env.PUBLIC_AUTH_OIDC_ENABLED === 'true' &&
    event.url.pathname.startsWith(`${base}/auth`) &&
    !event.url.pathname.startsWith(`${base}/auth/changeRole`)
  ) {
    error(
      500,
      `Attempting to access /auth endpoint "${event.url.pathname}" while OIDC enabled (env.PUBLIC_AUTH_OIDC_ENABLED='true').`,
    );
  }

  try {
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
      return addSecurityHeaders(await handleOIDCAuth({ event, resolve }));
    } else if (env.PUBLIC_AUTH_SSO_ENABLED === 'true') {
      return addSecurityHeaders(await handleSSOAuth({ event, resolve }));
    } else {
      return addSecurityHeaders(await handleJWTAuth({ event, resolve }));
    }
  } catch (e) {
    event.locals.user = null;
  }

  return addSecurityHeaders(await resolve(event));
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
