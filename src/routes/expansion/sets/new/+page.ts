import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../utilities/effects';
import { shouldRedirectToLogin } from '../../../../utilities/login';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  if (shouldRedirectToLogin(user)) {
    throw redirect(302, `${base}/login`);
  }

  const { plans: initialPlans } = await effects.getPlansAndModels(user);

  return { initialPlans, user };
};
