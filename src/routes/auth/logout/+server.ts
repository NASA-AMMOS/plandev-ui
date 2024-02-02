import { base } from '$app/paths';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { reqGatewayForwardCookies } from '../../../utilities/requests';
import { env } from '$env/dynamic/public';

export const POST: RequestHandler = async event => {
  const invalidated =
    env.PUBLIC_AUTH_SSO_ENABLED === 'true'
      ? await reqGatewayForwardCookies<boolean>('/auth/logoutSSO', event.request.headers.get('cookie') ?? '', base)
      : true;

  return json(
    { message: 'Logout successful', success: invalidated },
    {
      headers: {
        'set-cookie': `activeRole=deleted; path=${base}/,user=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      },
    },
  );
};
