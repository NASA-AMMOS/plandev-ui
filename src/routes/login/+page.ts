import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user, permissibleQueries } = await parent();

  if (user && permissibleQueries && Object.keys(permissibleQueries).length) {
    throw redirect(302, `${base}/plans`);
  }

  return {};
};
