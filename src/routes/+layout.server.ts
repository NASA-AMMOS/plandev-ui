import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import { enforce } from '../lib/server/oidc';
import { userIsDefined } from '../lib/server/rule';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const nonProtectedPage: boolean =
    url.pathname.includes('error') ||
    url.pathname.includes('oidc') ||
    url.pathname.includes('login') ||
    url.pathname.includes('auth');
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true' && !nonProtectedPage) {
    try {
      enforce(locals?.user, userIsDefined);
    } catch (error) {
      console.log(error);
      const redirectTo = encodeURIComponent(url.pathname + url.search);
      redirect(302, `${base}/login?redirectTo=${redirectTo}`);
    }
  } else if (!nonProtectedPage && !locals.user) {
    const redirectTo = encodeURIComponent(url.pathname + url.search);
    redirect(302, `${base}/login?redirectTo=${redirectTo}`);
  }
  return { user: locals.user };
};
