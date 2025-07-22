// import { base } from '$app/paths';
// import { redirect } from '@sveltejs/kit';
// import { shouldRedirectToLogin } from '../utilities/login';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // if (!url.pathname.includes('login') && shouldRedirectToLogin(locals.user)) { // TODO: we do need this because cam depends on it :(, wrap in an if not doing OIDC case
  //   redirect(302, base);
  // }
  return { ...locals };
};
