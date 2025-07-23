import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
  console.debug('/auth/logout');
  const refreshToken = cookies.get('refreshToken');
  const idToken = cookies.get('idToken') ?? '';

  // revoke the refresh token (if present)
  if (refreshToken) {
    const refreshRevokeResponse = await fetch(
      'https://keycloak.shared-services.appdat.jsc.nasa.gov/auth/realms/ssmo-dev/protocol/openid-connect/logout',
      {
        body: new URLSearchParams({
          client_id: 'ssmo-dev-shared-aerie',
          refresh_token: refreshToken,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    );

    console.log(refreshRevokeResponse);
  }

  // delete cookies here
  cookies.delete('accessToken', { path: '/' });
  cookies.delete('idToken', { path: '/' });
  cookies.delete('refreshToken', { path: '/' });

  // redirect browser to Keycloak logout page (SSO session destroy)
  const keycloakLogoutUrl = new URL(
    'https://keycloak.shared-services.appdat.jsc.nasa.gov/auth/realms/ssmo-dev/protocol/openid-connect/logout',
  );

  keycloakLogoutUrl.searchParams.set('post_logout_redirect_uri', 'http://localhost:3000/plans'); // TODO: ??????? IS THIS RIGHT?
  keycloakLogoutUrl.searchParams.set('id_token_hint', idToken);

  // return a string for the redirect URL...
  redirect(302, keycloakLogoutUrl.toString());
};
