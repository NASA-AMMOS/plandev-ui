import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import effects from '../../utilities/effects';
import { hasNoAuthorization } from '../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user, permissibleQueries } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(permissibleQueries))) {
    throw redirect(302, `${base}/login`);
  }

  const { plans: initialPlans } = await effects.getPlansAndModels();

  return {
    initialPlans,
  };
};
