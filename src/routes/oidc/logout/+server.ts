import * as auth from '$lib/server/oidc';
import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
  console.debug('/oidc/logout (GET)');

  const client = auth.Client.instance;
  const idToken = cookies.get('idToken') ?? '';

  // delete cookies here
  cookies.delete('accessToken', { path: '/' });
  cookies.delete('idToken', { path: '/' });
  cookies.delete('refreshToken', { path: '/' });

  cookies.delete('activeRole', { path: '/' });

  // redirect browser to logout page (SSO session destroy)
  const logoutUrl = new URL(client.getLogoutEndpoint());

  logoutUrl.searchParams.set('post_logout_redirect_uri', client.getRedirectEndpoint());
  logoutUrl.searchParams.set('id_token_hint', idToken);

  // redirect to the logout endpoint
  redirect(302, logoutUrl.toString());
};
