import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import { shouldRedirectToLogin } from '../utilities/login';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'false') {
    if (!url.pathname.includes('login') && shouldRedirectToLogin(locals.user)) {
      redirect(302, base);
    }
  }
  return { ...locals };
};
