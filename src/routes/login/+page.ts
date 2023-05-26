import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { permissibleQueries as permissibleQueriesStore } from '../../stores/app';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  if (user && Object.keys(permissibleQueriesStore).length) {
    throw redirect(302, `${base}/plans`);
  }

  return {};
};
