import { browser, dev } from '$app/environment';
import * as env from '$env/static/private';
import type { HasuraToken, MaybeToken, Rule } from '$lib/types/oidc';
import { type Cookies, type RequestEvent } from '@sveltejs/kit';
import * as arctic from 'arctic';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import type { User } from '../../types/app';
import { reqHasura } from '../../utilities/requests';

/**
 * Generate a cryptographically secure nonce for OIDC.
 * The nonce prevents replay attacks by binding the ID token to a specific authentication request.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

const DEFAULT_JWKS_CLIENT = (() => {
  if (env.OIDC_JWKS_URL) {
    return new JwksClient({ jwksUri: env.OIDC_JWKS_URL });
  }
})();

// Supported JWT signing algorithms. RS256 is the most common for OIDC.
// Can be overridden via OIDC_ALGORITHMS env var (space-separated, e.g., "RS256 RS384 RS512")
const SUPPORTED_ALGORITHMS = (env.OIDC_ALGORITHMS?.split(' ') || ['RS256']) as jwt.Algorithm[];

/**
 * Base verification options for all tokens (signature, issuer, expiration).
 * Access tokens are treated as opaque by OIDC clients - audience validation
 * is only required for ID tokens per the OIDC spec.
 */
const BASE_VERIFY_OPTS: jwt.VerifyOptions = {
  algorithms: SUPPORTED_ALGORITHMS,
  ignoreExpiration: false,
  issuer: env.OIDC_ISSUER,
};

/**
 * ID token verification includes audience validation per OIDC spec.
 * The audience must match the client ID that requested the token.
 */
const ID_TOKEN_VERIFY_OPTS: jwt.VerifyOptions = {
  ...BASE_VERIFY_OPTS,
  audience: env.OIDC_AUDIENCE || undefined,
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
  // Access tokens use base verification (no audience check - treated as opaque per OIDC spec)
  await verify(evt.cookies.get('accessToken')).catch(_ => evt.cookies.delete('accessToken', { path: '/' }));
  // ID tokens require audience validation per OIDC spec
  await verify(evt.cookies.get('idToken'), DEFAULT_JWKS_CLIENT, ID_TOKEN_VERIFY_OPTS).catch(_ =>
    evt.cookies.delete('idToken', { path: '/' }),
  );
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
      const client = await Client.instance;
      const tokens = await client.refresh(refreshToken);
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
  opts: jwt.VerifyOptions = BASE_VERIFY_OPTS,
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
 * Verify that the nonce in an ID token matches the expected nonce.
 * This prevents replay attacks where an attacker reuses a previously issued ID token.
 *
 * @param idToken - The raw ID token string
 * @param expectedNonce - The nonce that was sent in the authorization request
 * @throws {Error} If the nonce doesn't match or is missing
 */
export function verifyNonce(idToken: string, expectedNonce: string): void {
  const decoded = jwt.decode(idToken) as { nonce?: string } | null;
  if (!decoded) {
    throw new Error('Failed to decode ID token for nonce verification');
  }
  if (!decoded.nonce) {
    throw new Error('ID token is missing nonce claim');
  }
  if (decoded.nonce !== expectedNonce) {
    throw new Error('ID token nonce does not match expected nonce (possible replay attack)');
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
  private static _initPromise: Promise<Client>;

  private authorizationEndpoint!: string;
  private client!: arctic.OAuth2Client;
  private clientId!: string;
  private clientSecret!: string | null;
  private logoutEndpoint!: string;
  private redirectEndpoint!: string;
  private scopes!: string[];
  private tokenEndpoint!: string;

  private constructor() {
    // Use init() for async initialization
  }

  private async init(): Promise<void> {
    // Fetch well-known configuration first if URL is provided
    if (env.OIDC_WELL_KNOWN_URL) {
      try {
        const res = await fetch(env.OIDC_WELL_KNOWN_URL);
        const data = await res.json();
        this.authorizationEndpoint = data.authorization_endpoint ?? data.authorizationEndpoint;
        this.tokenEndpoint = data.token_endpoint ?? data.tokenEndpoint;
        this.logoutEndpoint = data.end_session_endpoint ?? data.endSessionEndpoint;
      } catch (err) {
        console.error('Error fetching OIDC configuration:', err);
      }
    }

    // Fall back to explicit env vars if not set from well-known
    this.authorizationEndpoint ??= env.OIDC_AUTHORIZATION_URL;
    this.tokenEndpoint ??= env.OIDC_TOKEN_URL;
    this.redirectEndpoint = env.OIDC_REDIRECT_URI;
    this.logoutEndpoint ??= env.OIDC_LOGOUT_URL;
    this.clientId = env.OIDC_CLIENT_ID;
    this.clientSecret = env.OIDC_CLIENT_SECRET || null;
    this.scopes = env.OIDC_SCOPES ? env.OIDC_SCOPES.split(' ') : ['openid', 'profile', 'email'];

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

  static get instance(): Promise<Client> {
    if (!this._initPromise) {
      const client = new Client();
      this._initPromise = client.init().then(() => {
        this._instance = client;
        return client;
      });
    }
    return this._initPromise;
  }

  createAuthorizationURLWithPKCE(): { authorizationUrl: URL; nonce: string; state: string; verifier: string } {
    const verifier: string = arctic.generateCodeVerifier();
    const state: string = arctic.generateState();
    const nonce: string = generateNonce();
    const authorizationUrl: URL = this.client.createAuthorizationURLWithPKCE(
      this.authorizationEndpoint,
      state,
      arctic.CodeChallengeMethod.S256,
      verifier,
      this.scopes,
    );
    // Add nonce parameter for OIDC replay attack protection
    authorizationUrl.searchParams.set('nonce', nonce);
    return { authorizationUrl, nonce, state, verifier };
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
  // Access tokens use base verification (no audience check - treated as opaque per OIDC spec)
  const accessJwt = await verify(tokens.accessToken());
  // ID tokens require audience validation per OIDC spec
  const idJwt = await verify(tokens.idToken(), DEFAULT_JWKS_CLIENT, ID_TOKEN_VERIFY_OPTS);

  if (accessJwt && idJwt) {
    // SECURITY: Cookie settings explained:
    // - secure: only sent over HTTPS in production
    // - sameSite: 'lax' allows cookies on top-level navigations (needed for OIDC redirect back)
    //   but blocks cross-site POST requests (CSRF protection)
    // - httpOnly: false for accessToken/idToken because client JS needs them for Hasura requests
    // - httpOnly: true for refreshToken to protect it from XSS
    cookies.set('accessToken', tokens.accessToken(), { httpOnly: false, path: '/', sameSite: 'lax', secure: !dev });
    cookies.set('idToken', tokens.idToken(), { httpOnly: false, path: '/', sameSite: 'lax', secure: !dev });
    cookies.set('refreshToken', tokens.refreshToken(), { httpOnly: true, path: '/', sameSite: 'lax', secure: !dev });

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
