import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { reqGatewayForwardCookies } from '../../../utilities/requests';

export const POST: RequestHandler = async event => {
  const invalidated =
    env.PUBLIC_AUTH_SSO_ENABLED === 'true'
      ? await reqGatewayForwardCookies<boolean>('/auth/logoutSSO', event.request.headers.get('cookie') ?? '', base)
      : true;

  event.cookies.delete('activeRole', { path: '/' });
  event.cookies.delete('user', { path: '/' });
  return json({ message: 'Logout successful', success: invalidated });
};
