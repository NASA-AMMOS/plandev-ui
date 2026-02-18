import { env } from '$env/dynamic/private';
import { Client } from '$lib/server/oidc';
import { redirect } from '@sveltejs/kit';

/**
 * Submits the id token to the IDP, and uses that to end the SSO session. Also destroys the session locally.
 *
 * @param { cookies } - Expected to contain an 'idToken' cookie, as well as the 'refreshToken' and 'accessToken' cookies.
 * @returns a redirection to the IDP session destruction endpoint.
 */

export const GET = async ({ cookies }) => {
  console.debug('/oidc/logout (GET)');

  const client = await Client.instance;
  const idToken = cookies.get('idToken');

  // delete cookies here
  cookies.delete('accessToken', { path: '/' });
  cookies.delete('idToken', { path: '/' });
  cookies.delete('refreshToken', { path: '/' });

  cookies.delete('activeRole', { path: '/' });

  if (!idToken) {
    // No id token available (e.g., already cleared by another tab's logout or refresh failure).
    // We can't do an IdP logout without id_token_hint, so just redirect to origin.
    console.debug('No id token available for logout hint, redirecting to origin.');
    redirect(302, `${env.ORIGIN}`);
  }

  // Use the raw id token as the hint — the IdP needs it to identify the session,
  // not to validate freshness. Expired tokens are accepted by most IdPs (including Keycloak)
  // for logout hint purposes.
  const logoutUrl = new URL(client.getLogoutEndpoint());
  logoutUrl.searchParams.set('post_logout_redirect_uri', `${env.ORIGIN}`);
  logoutUrl.searchParams.set('id_token_hint', idToken);

  // redirect to the logout endpoint
  redirect(302, logoutUrl.toString());
};
