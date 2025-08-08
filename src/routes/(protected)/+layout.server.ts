import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import { enforce } from '../../lib/server/oidc';
import { userIsDefined } from '../../lib/server/rule';
import type { LayoutServerLoad } from './$types';

// moved everything into /app so this enforce check wouldn't also run on the +error.svelte page, which is redundant and a little broken.
export const load: LayoutServerLoad = async ({ locals }) => {
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    try {
      enforce(locals?.user, userIsDefined);
    } catch (error) {
      redirect(302, `${base}/login`)
    }
  }
  return { ...locals };
};
