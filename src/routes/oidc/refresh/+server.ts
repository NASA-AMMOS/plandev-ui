import { insertUser } from '$lib/client/oidc';
import * as auth from '$lib/server/oidc';
import type { HasuraToken } from '$lib/types/oidc';
import { error, json } from '@sveltejs/kit';

/**
 * Requests a new access and refresh token.
 *
 * This endpoint is intended to be called from the client at a regular interval.
 *
 * @param { cookies } - Expected to contain a 'refreshToken' cookie.
 * @returns JSON response with new access token or error.
 */
export const POST = async ({ cookies }) => {
  console.debug('/auth/refresh');

  const refreshToken = cookies.get('refreshToken');

  if (!refreshToken) {
    return json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    const client = auth.Client.instance;
    const tokens = await client.refresh(refreshToken);

    // Check token validity.
    const accessJwt = await auth.verify(tokens.accessToken());
    const idJwt = await auth.verify(tokens.accessToken());

    if (!tokens) {
      throw error(500, 'tokens came back null');
    }

    if (accessJwt && idJwt) {
      // TODO: Explain why it's not necessary to verify the tokens here...
      cookies.set('idToken', tokens.idToken(), { httpOnly: false, path: '/' });
      cookies.set('accessToken', tokens.accessToken(), { httpOnly: false, path: '/' });
      cookies.set('refreshToken', tokens.refreshToken(), { httpOnly: true, path: '/' });

      // TODO: update the user object in PageData??? because that's technically not valid anymore

      // sort of an edge case, but if default role does change at the idp, it wouldn't hurt to update the local entry
      insertUser(accessJwt as HasuraToken, tokens.accessToken());

      // Tokens are returned as JSON for convenience. The client is able to extract tokens from
      // cookie values, not JSON.
      return json({
        accessToken: tokens.accessToken(),
        idToken: tokens.idToken(),
      });
    } else {
      return json({ huh: 'that sure is ood' });
    }
  } catch (e: any) {
    console.error('Error refreshing token:', e);
    return json(
      {
        error: 'token_refresh_failed',
        message: e?.message || 'An error occurred while refreshing the token.',
      },
      { status: 500 },
    );
  }
};
