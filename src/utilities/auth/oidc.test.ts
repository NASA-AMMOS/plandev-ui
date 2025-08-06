import { getRequest } from '@sveltejs/kit/node';
import jwt from 'jsonwebtoken';
import { describe, expect, test } from 'vitest';
import { extractTokens } from './oidc';

const ISSUER_SECRET = 'test-secret';

const SAMPLE_ACCESS_TOKEN_CLAIMS = {
  "sub": "user-id-123",
  "aud": "aerie-services",
  "iss": "https://issuer.example",
  "scope": "read:things write:stuff"
}

const SAMPLE_ID_TOKEN_CLAIMS = {
  "sub": "user-id-123",
  "name": "Alice",
  "email": "alice@example.com",
  "aud": "your-client-id",
  "iss": "https://issuer.example",
}

const SAMPLE_REFRESH_TOKEN_CLAIMS = {
  "sub": "user-id-123",
  "iss": "https://issuer.example",
  "jti": "unique-token-id",
  "type": "refresh"
}

/**
 * 
 * @param payload - claims to be added to the JWT.
 * @param options - signing options, such as `expiresIn`.
 * @param options.algorithm - The algorithm to use for signing the JWT, defaults to 'HS256'.
 * @param options.expiresIn - The expiration time for the JWT, defaults to '1h'.
 * @param options.issuer - The issuer of the JWT, defaults to 'https://issuer.example'.
 * @returns {string} - Raw JWT string signed with the ISSUER_SECRET.
 */
function generateTestJWT(payload = {}, options = {}) {
  return jwt.sign(payload, ISSUER_SECRET, { algorithm: 'HS256', expiresIn: '1h', ...options });
}

function generateRequestEvent(request: Request) {
  getRequest({ request })
}

/**
 * These tests cover the low-level functionality of extracting and decoding JWT tokens from cookies.
 * Originally, I was hoping to use the SvelteKit `RequestEvent`, but there isn't a way to build those.
 */
describe('decoding JWT tokens in cookies', () => {
  test('missing cookies are to be expected', () => {
    const tokens = extractTokens({});
    expect(tokens['jwt-id-token']).toBeUndefined();
    expect(tokens['jwt-access-token']).toBeUndefined();
    expect(tokens['jwt-refresh-token']).toBeUndefined();
  });
  test('extraneous cookies are ignored', () => {
    const tokens = extractTokens({
      'unexpected-access-token': generateTestJWT(SAMPLE_ACCESS_TOKEN_CLAIMS),
    });
    expect(tokens['unexpected-access-token']).toBeUndefined();
  });
  test('malformed cookies are skipped', () => {
    const tokens = extractTokens({
      'jwt-id-token': 'malformed',
      'jwt-access-token': 'malformed',
      'jwt-refresh-token': 'malformed'
    });
    expect(tokens['jwt-id-token']).toBeUndefined();
    expect(tokens['jwt-access-token']).toBeUndefined();
    expect(tokens['jwt-refresh-token']).toBeUndefined();
  });
  test('wellformed cookies are decoded', () => {
    const tokens = extractTokens({
      'jwt-id-token': generateTestJWT(SAMPLE_ID_TOKEN_CLAIMS),
      'jwt-access-token': generateTestJWT(SAMPLE_ACCESS_TOKEN_CLAIMS),
      'jwt-refresh-token': generateTestJWT(SAMPLE_REFRESH_TOKEN_CLAIMS)
    });
    expect(tokens['jwt-id-token']).toEqual(expect.objectContaining(SAMPLE_ID_TOKEN_CLAIMS));
    expect(tokens['jwt-access-token']).toEqual(expect.objectContaining(SAMPLE_ACCESS_TOKEN_CLAIMS));
    expect(tokens['jwt-refresh-token']).toEqual(expect.objectContaining(SAMPLE_REFRESH_TOKEN_CLAIMS));
  });
  test('expired tokens are still decoded', () => {
    const expiredRefreshToken = generateTestJWT(SAMPLE_REFRESH_TOKEN_CLAIMS, { expiresIn: '-1h' });
    const tokens = extractTokens({
      'jwt-refresh-token': expiredRefreshToken
    });
    expect(tokens['jwt-refresh-token']).toEqual(expect.objectContaining(SAMPLE_REFRESH_TOKEN_CLAIMS));
  });
});

describe('states that cause users to initiate login', () => {
  test('a missing ID token',);
  test('a missing access token');
  test('a missing refresh token');
  test('an expired refresh token');
});