/**
 * Provide utilities for OpenID Connect (OIDC) authentication.
 *
 * Aerie expects OIDC to be configured via environment variables:
 *  * - `PUBLIC_IDENTITY_PROVIDER_URL`: The URL of the identity provider.
 *  * - `PUBLIC_OIDC_CLIENT_ID`: The client ID for the OIDC application.
 *
 * If both are set, OIDC is considered configured. If one is set without the other,
 * an error is thrown.
 *
 * Aerie expects OIDC tokens to be stored in cookies with the following names:
 * * - `jwt-access-token`: The access token.
 * * - `jwt-id-token`: The ID token.
 * * - `jwt-refresh-token`: The refresh token.
 *
 * If any of these tokens are missing, the user is redirected to the login page.
 *
 */

import { base } from '$app/paths';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { type JwtPayload } from 'jwt-decode';

const DEFAULT_JWT_COOKIE_KEYS = ['jwt-access-token', 'jwt-id-token', 'jwt-refresh-token'];

const LOGIN_RESPONSE_REDIRECT = new Response(null, {
  headers: { location: `${base}/login` },
  status: 307,
});

/**
 * Extracts cookies specified by keys from the provided Cookies object.
 *
 * Missing keys will be omitted from the result.
 *
 * @param {Record<string, string>} cookies - The Cookies object from which to extract cookies.
 * @param {string[]} keys - An array of cookie names to extract.
 * @returns {Record<string, string>} An object mapping cookie names to their values.
 */
function filter(cookies: Record<string, string>, keys: string[]): Record<string, string> {
  const present = keys.filter(key => cookies[key] !== undefined);
  const entries: [string, string][] = present.map((key: string): [string, string] => [key, cookies[key] || '']);
  return Object.fromEntries(entries);
}

/**
 * Converts an object of string JWT tokens (cookie names and their values) into a JwtPayload.
 *
 * @param {Record<string, string>} tokens
 * @returns {Record<string, JwtPayload>} An object mapping cookie names to their decoded JWT payloads.
 * @throws {Error} If a token cannot be decoded, it will log a warning and skip the malformed token.
 */
function decode(tokens: Record<string, string>): Record<string, JwtPayload> {
  return Object.entries(tokens).reduce((acc: Record<string, JwtPayload>, [key, value]: [string, string]): any => {
    try {
      return { ...acc, [key]: jwt.verify(value, { complete: true }) };
    } catch (error) {
      console.warn(`Skipping value in key "${key}", failed to decode:`, error);
      return acc;
    }
  }, {});
}

/**
 * Combine the extract and transform functions to extract and decode JWT tokens from cookies.
 *
 * @param {RequestEvent} event
 * @param {string[]} cookieKeys
 * @returns {Record<string, JwtPayload>} An object mapping cookie names to their decoded JWT payloads.
 */
export function extract(cookies: Record<string, string>, cookieKeys: string[] = DEFAULT_JWT_COOKIE_KEYS) {
  return decode(filter(cookies, cookieKeys));
}

export function verify(tokens: Record<string, jwt.Jwt>): Record<string, jwt.Jwt> {
  const verified: Record<string, jwt.Jwt> = {};
  for (const [key, { payload, signature }] of Object.entries(tokens)) {
    jwt.verify(payload, { complete: true });
    if (!payload) {
      throw new Error(`Token for "${key}" has no payload.`);
    }
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error(`Token for "${key}" is expired.`);
    }
    if (payload.iss !== process.env.PUBLIC_IDENTITY_PROVIDER_URL) {
      throw new Error(`Token for key "${key}" issuer mismatch: expected ${process.env.PUBLIC_IDENTITY_PROVIDER_URL}, got ${payload.iss}.`);
    }
  }
  return verified;
}

export const handler: Handle = async ({ event, resolve }) => {
  // Skip the OIDC flow if the path is for the OIDC login or callback.
  if (event.url.pathname.includes('/oidc')) {
    console.debug('Skipping OIDC flow for an OIDC login route:', event.url.pathname);
    return await resolve(event);
  }

  // Extract OIDC tokens from cookies.
  try {
    verify(extract(event.cookies));
    // Verify tokens
    // If tokens have expired
  } catch (error) {
    console.error('Redirecting to login, error extracting OIDC tokens:', error);
    return LOGIN_RESPONSE_REDIRECT;
  }


  // Ensure freshness of the access and ID tokens.
  // ...a stale access or ID token triggers a refresh flow.
  // Otherwise, you're good to go.

  return event.url.pathname.includes('/oidc')
    ? await resolve(event)
    : LOGIN_RESPONSE_REDIRECT;
};

/**
 * Determine if OpenID Connect (OIDC) is configured based on environment variables.
 *
 * @returns  {boolean} true if OIDC is configured, false otherwise
 * @throws {Error} if only one of PUBLIC_IDENTITY_PROVIDER_URL or PUBLIC_OIDC_CLIENT_ID is set
 */
export function isOidcConfigured(): boolean {
  const idp_url = process.env.PUBLIC_IDENTITY_PROVIDER_URL;
  const client_name = process.env.PUBLIC_OIDC_CLIENT_ID;
  if (!idp_url && !client_name) {
    return false; // OIDC is not configured
  }
  if (idp_url && !client_name) {
    throw new Error("PUBLIC_IDENTITY_PROVIDER_URL is set but PUBLIC_OIDC_CLIENT_ID is not. Both must be set for OIDC to work.");
  }
  if (!idp_url && client_name) {
    throw new Error("PUBLIC_OIDC_CLIENT_ID is set but PUBLIC_IDENTITY_PROVIDER_URL is not. Both must be set for OIDC to work.");
  }
  return true; // OIDC is configured
}

export default {
  handler,
  isOidcConfigured,
}