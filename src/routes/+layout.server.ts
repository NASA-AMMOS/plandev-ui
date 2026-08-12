import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { shouldRedirectToLogin } from '../utilities/login';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!url.pathname.includes('login') && !url.pathname.includes('/offline') && shouldRedirectToLogin(locals.user)) {
    const redirectTo = encodeURIComponent(url.pathname + url.search);
    redirect(302, `${base}/login?redirectTo=${redirectTo}`);
  }
  return { user: locals.user };
};
