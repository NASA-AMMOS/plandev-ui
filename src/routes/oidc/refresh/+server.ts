import * as auth from '$lib/server/oidc';
import { json } from '@sveltejs/kit';

/**
 * Requests a new access and refresh token.
 *
 * This endpoint is intended to be called from the client at a regular interval.
 *
 * @param { cookies } - Expected to contain a 'refreshToken' cookie.
 * @returns JSON response with new access token, or 401 if refresh token is missing/expired.
 */
export const POST = async ({ cookies }) => {
  console.debug('/oidc/refresh');

  const refreshToken = cookies.get('refreshToken');

  if (!refreshToken) {
    return json({ error: 'missing_refresh_token', message: 'No refresh token available' }, { status: 401 });
  }

  try {
    const client = await auth.Client.instance;
    const tokens = await client.refresh(refreshToken);

    if (!tokens) {
      console.error('Tokens came back null after refresh.');
      return json({ error: 'refresh_failed', message: 'Token refresh returned no tokens' }, { status: 401 });
    }

    if (await auth.updateWithNewTokens(cookies, tokens)) {
      return json({
        accessToken: tokens.accessToken(),
        idToken: tokens.idToken(),
      });
    } else {
      return json({ error: 'token_verification_failed', message: 'New tokens failed verification' }, { status: 401 });
    }
  } catch (err) {
    // This is the key case: the refresh token has expired at the IdP.
    // The IdP rejects our refresh request, arctic throws an error.
    // We must return a 401 so the client can detect this and log out.
    console.error('Token refresh failed (refresh token likely expired):', err instanceof Error ? err.message : err);

    // Clean up the invalid refresh token
    cookies.delete('refreshToken', { path: '/' });

    return json({ error: 'refresh_token_expired', message: 'Refresh token is expired or invalid' }, { status: 401 });
  }
};
