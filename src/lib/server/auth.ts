import * as env from '$env/static/private';
import type { MaybeHasuraToken, MaybeToken, Rule } from '$lib/types/auth';
import { error, type RequestEvent } from '@sveltejs/kit';
import * as arctic from 'arctic';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import type { User } from '../../types/app';

const DEFAULT_JWKS_CLIENT = (() => {
  if (env.OIDC_JWKS_URL) {
    return new JwksClient({ jwksUri: env.OIDC_JWKS_URL });
  }
})();

const DEFAULT_VERIFY_OPTS: jwt.VerifyOptions = {
  algorithms: ['RS256'],
  ignoreExpiration: false,
  issuer: env.OIDC_ISSUER,
};

/**
 * Remove invalid tokens, refresh if appropriate, and set locals for tokens and roles.
 *
 * Will log but not raise any errors.
 *
 * @param {RequestEvent} event - The SvelteKit request event containing cookies.
 */
export async function handler(event: RequestEvent): Promise<RequestEvent> {
  return sanitize(event).then(refresh);
}

/**
 * Removes invalid access or id tokens.
 *
 * Note: This **may** mutate the given event.
 *
 * @param evt
 * @returns RequestEvent
 */
async function sanitize(evt: RequestEvent) {
  await verify(evt.cookies.get('accessToken')).catch(_ => evt.cookies.delete('accessToken', { path: '/' }));
  await verify(evt.cookies.get('idToken')).catch(_ => evt.cookies.delete('idToken', { path: '/' }));
  return evt;
}

/**
 * Refreshes tokens iff access or id token is missing.
 *
 * Note: This **may** mutate the given event.
 *
 * @param evt
 * @returns RequestEvent
 */
async function refresh(evt: RequestEvent) {
  const path = '/';
  if (!evt.cookies.get('accessToken') || !evt.cookies.get('idToken')) {
    await Client.instance
      .refresh(evt.cookies.get('refreshToken') || '')
      .then(tokens => {
        evt.cookies.set('accessToken', tokens.accessToken(), { path, httpOnly: false });
        evt.cookies.set('idToken', tokens.idToken(), { path, httpOnly: false });
        evt.cookies.set('refreshToken', tokens.refreshToken(), { path, httpOnly: true });
      })
      .catch(() => evt.cookies.delete('refreshToken', { path: '/' }));
  }
  return evt;
}

/**
 * Verify ensures raw token values are signed by the expected issuer and haven't expired.
 *
 * @param token - The raw base64 encoded JWT token to verify. If null, the function will return null.
 * @param opts - Verification options to pass to jsonwebtoken. Defaults to sensible defaults.
 * @returns The decoded JWT payload if verification is successful, otherwise throws an error.
 * @throws {Error} If the token is invalid, expired, or if there are issues
 */
export async function verify(
  token: string | undefined,
  client = DEFAULT_JWKS_CLIENT,
  opts: jwt.VerifyOptions = DEFAULT_VERIFY_OPTS,
): Promise<MaybeToken> {
  if (!token) {
    return undefined;
  }
  if (!client) {
    return new Error('Cannot verify without a configured JWKS Client');
  }
  if (client) {
    const header = jwt.decode(token, { complete: true })?.header;
    if (!header) {
      throw new Error('Malformed token: no header present.');
    }
    const key = await client.getSigningKey(header.kid);
    return jwt.verify(token, key.getPublicKey(), opts) as MaybeToken;
  }
}

/**
 * Client is a singleton that manages OAuth2/OIDC interactions.
 *
 * It avoids re-fetching OIDC configuration by caching values on first use.
 *
 */
export class Client {
  private static _instance: Client;

  private authorizationEndpoint: string;
  private tokenEndpoint: string;
  private redirectEndpoint: string;
  private clientId: string;
  private clientSecret: string | null;
  private scopes: string[];
  private client: arctic.OAuth2Client;

  private constructor() {
    if (env.OIDC_WELL_KNOWN_URL) {
      fetch(env.OIDC_WELL_KNOWN_URL)
        .then(res => res.json())
        .then(data => {
          this.authorizationEndpoint ??= data.authorizationEndpoint;
          this.tokenEndpoint ??= data.tokenEndpoint;
        })
        .catch(err => {
          console.error('Error fetching OIDC configuration:', err);
        });
    }

    // ??= is used to preserve any values set from the well-known URL.
    this.authorizationEndpoint ??= env.OIDC_AUTHORIZATION_URL;
    this.tokenEndpoint ??= env.OIDC_TOKEN_URL;
    this.redirectEndpoint ??= env.OIDC_REDIRECT_URI;
    this.clientId ??= env.OIDC_CLIENT_ID;
    this.clientSecret ??= env.OIDC_CLIENT_SECRET || null;
    this.scopes ??= env.OIDC_SCOPES ? env.OIDC_SCOPES.split(' ') : ['openid', 'profile', 'email'];

    // The entire client configuration is validated here, this should help
    // people understand everything they need to set without having to fix
    // one problem... then another... then another...
    const problems = this.validateConfiguration();

    if (problems.length > 0) {
      throw new Error('OAuth2 client configuration is incomplete.', { cause: problems });
    } else {
      this.client = new arctic.OAuth2Client(this.clientId, this.clientSecret, this.redirectEndpoint);
    }
  }

  private validateConfiguration(): string[] {
    const problems: string[] = [];

    if (!this.authorizationEndpoint) {
      problems.push('Missing OIDC authorization endpoint. Check OIDC_WELL_KNOWN_URL or OIDC_AUTHORIZATION_URL.');
    }

    if (!this.tokenEndpoint) {
      problems.push('Missing OIDC token endpoint. Check OIDC_WELL_KNOWN_URL or OIDC_TOKEN_URL.');
    }

    if (!this.redirectEndpoint) {
      problems.push('Missing OIDC redirect URI. Check OIDC_WELL_KNOWN_URL or OIDC_REDIRECT_URI.');
    }

    if (!this.clientId) {
      problems.push('Missing OIDC client ID. Check OIDC_CLIENT_ID.');
    }

    if (this.scopes.length === 0) {
      problems.push('Missing OIDC scopes. Check OIDC_SCOPES environment variable.');
    }

    if (!this.scopes.includes('openid')) {
      problems.push('OIDC scopes must include "openid". Check OIDC_SCOPES environment variable.');
    }

    return problems;
  }

  static get instance() {
    this._instance ??= new Client();
    return this._instance;
  }

  createAuthorizationURLWithPKCE(): { verifier: string; state: string; authorizationUrl: URL } {
    const verifier: string = arctic.generateCodeVerifier();
    const state: string = arctic.generateState();
    const authorizationUrl: URL = this.client.createAuthorizationURLWithPKCE(
      this.authorizationEndpoint,
      state,
      arctic.CodeChallengeMethod.S256,
      verifier,
      this.scopes,
    );
    return { verifier, state, authorizationUrl };
  }

  /**
   * Exchange an authorization code (and verifier) for tokens.
   *
   * @param code
   * @param verifier
   * @returns
   */
  async exchange(code: string, verifier: string): Promise<arctic.OAuth2Tokens | undefined> {
    return this.client.validateAuthorizationCode(this.tokenEndpoint, code, verifier);
  }

  /**
   * Request new tokens using a refresh token.
   *
   * @param token - The refresh token to use to obtain new tokens.
   * @returns
   */
  async refresh(token: string): Promise<arctic.OAuth2Tokens> {
    return this.client.refreshAccessToken(this.tokenEndpoint, token, this.scopes);
  }
}

/// Helpers for guarding against unauthorized access.
///

export function rolesIn(token: MaybeHasuraToken): string[] {
  return token?.['https://hasura.io/jwt/claims']?.['x-hasura-allowed-roles'] || [];
}

/**
 * Helper function for +server.ts or +page.server.ts to enforce the existence of certain roles.
 *
 * @param token
 * @returns
 */
export function roles(token: MaybeHasuraToken) {
  if (!token) {
    throw error(401, 'No token found, you must be logged in to view this page');
  }

  // This is intentionally specific to Hasura claims... Other parts of the Aerie system
  // rely on this to determine a user's roles. In theory, this could be factored out to use
  // a jq or JSON path expression provided as an environment variable, but that adds a lot
  // more sophistication than what we can handle right now.
  const roles = rolesIn(token);

  // This error is intended to help people get their IdP configured properly. Without it
  // people could present perfectly valid tokens and still get an error that tells them
  // they don't have a role.
  if (!roles) {
    throw error(403, "Token is present but your IdP did not add Hasura claims 'https://hasura.io/jwt/claims'");
  }

  // We think it's ok to tell people the expected role without leaking sensitive security
  // details.
  return {
    require: (role: string) => {
      if (!roles.includes(role)) {
        throw error(403, `Your token's roles do not include '${role}'`);
      }
      return true;
    },
  };
}

/*
 * This function provides developers with a way to evaluate their own rule
 * against an access token in +page.server.ts or +layout.server.ts
 *
 * It is **NOT** responsible for decoding the token, refreshing it, or
 * validating it.
 *
 * https://svelte.dev/docs/kit/load#Implications-for-authentication
 *
 * There are a few possible strategies to ensure an auth check occurs before protected code.
 *
 * To prevent data waterfalls and preserve layout load caches:
 *
 * Use hooks to protect multiple routes before any load functions run
 *
 * Use auth guards directly in +page.server.js load functions for route specific protection
 * Putting an auth guard in +layout.server.js requires all child pages to call
 * await parent() before protected code. Unless every child page depends on
 * returned data from await parent(), the other options will be more performant.
 */
export function enforce(user: User | null, rule: Rule): boolean {
  // Any value other than 'true' is considered a failure. This is intentional.
  if (rule(user) === true) {
    return true;
  } else {
    throw error(403, 'Unauthorized access: Rule evaluation failed');
  }
}
