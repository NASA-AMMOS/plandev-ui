import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { reqGatewayForwardCookies } from '../../../utilities/requests';

export const POST: RequestHandler = async event => {
  const response =
    env.PUBLIC_AUTH_SSO_ENABLED === 'true'
      ? await reqGatewayForwardCookies<boolean | string>('/auth/logoutSSO', event.request.headers.get('cookie') ?? '', base)
      : true;

    // NOTE: we MUST redirect to https://keycloak..../auth/realms/.../protocol/openid-connect/logout,
    //    so the url is passed in success;
    //    since we fetch to gateway (like normal) instead of redirecting to it or getting redirected back there 
    //    like our standard login flow, we have to clear cookies here (as clearing on a fetch to gateway...does 
    //    nothing.)
  return json(
    { message: 'Logout successful', success: response }, // response can be a string, but I wanted to change as little as possible in this fil, so the logic gets pushed to login.ts
    {
      headers: { // we could clear cookies much more easily IF we had a /callback route on gateway. as a matter of fact, the purpose of that route is specifically for cookie storage (and removal), in the login/refresh/logout cases!
        'set-cookie': `activeRole=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT,user=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT,access_token=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT,refresh_token=deleted; path=${base}/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      },
    },
  );
};
