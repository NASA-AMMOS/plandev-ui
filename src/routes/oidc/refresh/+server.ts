import * as auth from '$lib/server/oidc';
import { json } from '@sveltejs/kit';

/**
 * Requests a new access and refresh token.
 *
 * This endpoint is intended to be called from the client at a regular interval.
 *
 * @param { cookies } - Expected to contain a 'refreshToken' cookie.
 * @returns JSON response with new access token or error.
 */
export const POST = async ({ cookies }) => {
  console.debug('/oidc/refresh');

  const refreshToken = cookies.get('refreshToken');

  if (!refreshToken) {
    throw new Error(`Error refreshing token - user is unauthenticated.`);
  }

  const client = await auth.Client.instance;
  const tokens = await client.refresh(refreshToken);

  if (!tokens) {
    // okay to throw here, since it's a POST, not a GET.
    console.error('Tokens came back null.');
    throw new Error('Tokens came back null.');
  }

  if (await auth.updateWithNewTokens(cookies, tokens)) {
    // Tokens are returned as JSON for convenience. The client is able to extract tokens from
    // cookie values, not JSON.
    return json({
      accessToken: tokens.accessToken(),
      idToken: tokens.idToken(),
    });
  } else {
    throw new Error(`Failed to verify new access token after refresh.`);
  }
};
