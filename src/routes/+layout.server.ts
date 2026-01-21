import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import { enforce } from '../lib/server/oidc';
import { userIsDefined } from '../lib/server/rule';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async event => {
  const nonProtectedPage: boolean =
    event.url.pathname.includes('error') ||
    event.url.pathname.includes('oidc') ||
    event.url.pathname.includes('login') ||
    event.url.pathname.includes('auth');
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true' && !nonProtectedPage) {
    try {
      enforce(event.locals?.user, userIsDefined);
    } catch (error) {
      console.log(error);
      redirect(302, `${base}/login`);
    }
  }
return { user: event.locals.user };
};
