import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from '@sveltejs/kit';
import { json, redirect } from '@sveltejs/kit';
import { reqGatewayForwardCookies } from '../../../utilities/requests';

export const POST: RequestHandler = async event => {
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    const code = 401;
    const message = encodeURI(
      'Using non-oidc endpoint for logout, when OIDC mode is enabled (PUBLIC_AUTH_OIDC_ENABLED=true).',
    );
    throw redirect(303, `/error-redirect?code=${code}&message=${message}`);
  }

  const invalidated =
    env.PUBLIC_AUTH_SSO_ENABLED === 'true'
      ? await reqGatewayForwardCookies<boolean>('/auth/logoutSSO', event.request.headers.get('cookie') ?? '', base)
      : true;

  event.cookies.delete('activeRole', { path: '/' });
  event.cookies.delete('user', { path: '/' });
  return json({ message: 'Logout successful', success: invalidated });
};
