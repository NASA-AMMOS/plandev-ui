import { browser } from '$app/environment';
import * as env from '$env/static/private';
import type { HasuraToken, MaybeToken, Rule } from '$lib/types/oidc';
import { type Cookies, type RequestEvent } from '@sveltejs/kit';
import * as arctic from 'arctic';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import type { User } from '../../types/app';
import { reqHasura } from '../../utilities/requests';

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
 * Only invoked on page refresh. Does not execute behavior if cookies expire and page doesn't refresh (see cookieStoreListener() for that)
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
 * Only invoked in handler.
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
 * Only invoked in handler.
 *
 * Note: This **may** mutate the given event.
 *
 * @param evt
 * @returns RequestEvent
 */
async function refresh(evt: RequestEvent) {
  if (!evt.cookies.get('accessToken') || !evt.cookies.get('idToken')) {
    const refreshToken: string | undefined = evt.cookies.get('refreshToken');
    if (refreshToken) {
      // unconditionally clear refreshToken. if it was invalid, we don't want it, and if it's valid, it will be replaced!
      evt.cookies.delete('refreshToken', { path: '/' });
      const tokens = await Client.instance.refresh(refreshToken);
      await updateWithNewTokens(evt.cookies, tokens);
    }
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
    throw new Error('Cannot verify JWT without a configured JWKS Client');
  }
  if (client) {
    const header = jwt.decode(token, { complete: true })?.header;
    if (!header) {
      throw new Error('Malformed JWT token: no header present.');
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
  private client: arctic.OAuth2Client;
  private clientId: string;
  private clientSecret: string | null;
  private logoutEndpoint: string;
  private redirectEndpoint: string;
  private scopes: string[];
  private tokenEndpoint: string;

  private constructor() {
    if (env.OIDC_WELL_KNOWN_URL) {
      fetch(env.OIDC_WELL_KNOWN_URL)
        .then(res => res.json())
        .then(data => {
          this.authorizationEndpoint ??= data.authorizationEndpoint ?? data.authorization_endpoint;
          this.tokenEndpoint ??= data.tokenEndpoint ?? data.token_endpoint;
          this.logoutEndpoint ??= data.endSessionEndpoint ?? data.end_session_endpoint;
        })
        .catch(err => {
          console.error('Error fetching OIDC configuration:', err);
        });
    }

    // ??= is used to preserve any values set from the well-known URL.
    this.authorizationEndpoint ??= env.OIDC_AUTHORIZATION_URL;
    this.tokenEndpoint ??= env.OIDC_TOKEN_URL;
    this.redirectEndpoint ??= env.OIDC_REDIRECT_URI;
    this.logoutEndpoint ??= env.OIDC_LOGOUT_URL;
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

  static get instance() {
    this._instance ??= new Client();
    return this._instance;
  }

  createAuthorizationURLWithPKCE(): { authorizationUrl: URL; state: string; verifier: string } {
    const verifier: string = arctic.generateCodeVerifier();
    const state: string = arctic.generateState();
    const authorizationUrl: URL = this.client.createAuthorizationURLWithPKCE(
      this.authorizationEndpoint,
      state,
      arctic.CodeChallengeMethod.S256,
      verifier,
      this.scopes,
    );
    return { authorizationUrl, state, verifier };
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

  // arctic handles token revocation, but not logout, as described here https://blog.elest.io/keycloak-token-management-expiration-revocation-and-renewal/, which is what we want to end the session
  getLogoutEndpoint(): string {
    return this.logoutEndpoint;
  }

  getRedirectEndpoint(): string {
    return this.redirectEndpoint;
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
}

const mutation = `mutation InsertUser($input: users_insert_input!) {
  insert_users_one(
    object: $input,
    on_conflict: {
      constraint: users_pkey,
      update_columns: default_role
    }
  ) {
    username
  }
}`; // TODO: update other user tables in permissions schema?

async function upsertUser(decodedAccessToken: HasuraToken, accessToken: string): Promise<void> {
  const username = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-user-id'];
  // const defaultRole = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-default-role'];
  const allowedRoles = decodedAccessToken['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'];

  // set the active and default role manually:
  let defaultRole = 'viewer';
  switch (true) {
    case allowedRoles.includes('aerie_admin'):
      defaultRole = 'aerie_admin';
      break;
    case allowedRoles.includes('user'):
      defaultRole = 'user';
      break;
    default:
      defaultRole = 'viewer';
  }

  const input = { default_role: defaultRole, username };
  const user: User = {
    activeRole: defaultRole, // TODO: check allowed roles and pick highest. forget about default role.
    allowedRoles,
    defaultRole,
    id: username, // TODO: not exactly. I think this is supposed to be decodedAccessToken.sub. but we don't even use it.
    permissibleQueries: null,
    rolePermissions: null,
    token: accessToken,
  };
  console.log('Registering user:', user);
  const result = await reqHasura(mutation, { input }, user);
  console.log('Registered user: ', result);
}

export async function updateWithNewTokens(cookies: Cookies, tokens: arctic.OAuth2Tokens): Promise<boolean> {
  console.log('Persisting tokens following a refresh...', browser);

  // Check token validity.
  const accessJwt = await verify(tokens.accessToken());
  const idJwt = await verify(tokens.idToken());

  if (accessJwt && idJwt) {
    cookies.set('accessToken', tokens.accessToken(), { httpOnly: false, path: '/' });
    cookies.set('idToken', tokens.idToken(), { httpOnly: false, path: '/' });
    cookies.set('refreshToken', tokens.refreshToken(), { httpOnly: true, path: '/' });

    // sort of an edge case, but if default role does change at the idp, it wouldn't hurt to update the local entry
    // TODO: should this be here? Where else could it go?
    await upsertUser(accessJwt as HasuraToken, tokens.accessToken());
    return true;
  }

  return false;
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
    throw new Error('Unauthorized access: Rule evaluation failed');
  }
}
