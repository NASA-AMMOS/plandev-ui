import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
  console.debug('/auth/logout');
  const idToken = cookies.get('idToken') ?? '';

  // delete cookies here
  cookies.delete('accessToken', { path: '/' });
  cookies.delete('idToken', { path: '/' });
  cookies.delete('refreshToken', { path: '/' });

  // redirect browser to Keycloak logout page (SSO session destroy)
  const keycloakLogoutUrl = new URL(
    'https://keycloak.shared-services.appdat.jsc.nasa.gov/auth/realms/ssmo-dev/protocol/openid-connect/logout',
  );

  keycloakLogoutUrl.searchParams.set('post_logout_redirect_uri', 'http://localhost:3000/');
  keycloakLogoutUrl.searchParams.set('id_token_hint', idToken);

  // return a string for the redirect URL...
  redirect(302, keycloakLogoutUrl.toString());
};
