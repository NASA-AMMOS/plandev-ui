import { env } from '$env/dynamic/private';
import * as auth from '$lib/server/oidc';
import { redirect } from '@sveltejs/kit';

/**
 * Submits the id token to the IDP, and uses that to end the SSO session. Also destroys the session locally.
 *
 * @param { cookies } - Expected to contain an 'idToken' cookie, as well as the 'refreshToken' and 'accessToken' cookies.
 * @returns a redirection to the IDP session destruction endpoint.
 */

export const GET = async ({ cookies }) => {
  console.debug('/oidc/logout (GET)');

  const client = await auth.Client.instance;
  const idToken = cookies.get('idToken');

  // Verify the ID token before using it as a hint to the IdP.
  // If verification fails, we still proceed with logout but without the hint.
  let verifiedIdToken: string | undefined;
  if (idToken) {
    try {
      await auth.verifyIdToken(idToken);
      verifiedIdToken = idToken;
    } catch {
      // Token invalid or expired - proceed without hint
      console.debug('ID token verification failed during logout, proceeding without id_token_hint');
    }
  }

  // delete cookies here
  cookies.delete('accessToken', { path: '/' });
  cookies.delete('idToken', { path: '/' });
  cookies.delete('refreshToken', { path: '/' });

  cookies.delete('activeRole', { path: '/' });

  // redirect browser to logout page (SSO session destroy)
  const logoutUrl = new URL(client.getLogoutEndpoint());

  logoutUrl.searchParams.set('post_logout_redirect_uri', `${env.ORIGIN}`);
  if (verifiedIdToken) {
    logoutUrl.searchParams.set('id_token_hint', verifiedIdToken);
  }

  // redirect to the logout endpoint
  redirect(302, logoutUrl.toString());
};
