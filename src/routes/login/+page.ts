import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { hasNoAuthorization } from '../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  if (user && !hasNoAuthorization(user)) {
    throw redirect(302, `${base}/plans`);
  }

  return { user };
};
