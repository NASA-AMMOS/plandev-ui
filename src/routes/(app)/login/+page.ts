import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import { hasNoAuthorization } from '../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  // should not be on this page if using OIDC, so just redirect to plans.
  if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true' && browser) {
    goto(`${base}/plans`);
  }

  const { user } = await parent();

  if (user && !hasNoAuthorization(user)) {
    redirect(302, `${base}/plans`);
  }

  return { user };
};
