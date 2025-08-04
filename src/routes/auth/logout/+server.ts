import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { reqGatewayForwardCookies } from '../../../utilities/requests';

export const POST: RequestHandler = async event => {
  if (env.PUBLIC_AUTH_OIDC_ENABLED) {
    throw new Error('Using non-oidc endpoint for login, when OIDC mode is enabled (PUBLIC_AUTH_OIDC_ENABLED=true).');
  }

  const invalidated =
    env.PUBLIC_AUTH_SSO_ENABLED === 'true'
      ? await reqGatewayForwardCookies<boolean>('/auth/logoutSSO', event.request.headers.get('cookie') ?? '', base)
      : true;

  return json(
    { message: 'Logout successful', success: invalidated },
    {
      headers: {
        'set-cookie': `activeRole=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT,user=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      },
    },
  );
};
