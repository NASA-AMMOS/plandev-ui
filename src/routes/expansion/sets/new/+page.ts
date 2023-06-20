import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { shouldRedirectToLogin } from '../../../../utilities/login';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  if (shouldRedirectToLogin(user)) {
    throw redirect(302, `${base}/login`);
  }

  return { user };
};
