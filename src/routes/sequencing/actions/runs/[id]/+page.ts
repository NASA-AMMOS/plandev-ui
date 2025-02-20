import { get } from 'svelte/store';
import { actionRuns } from '../../../../../stores/actions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const actionRun = get(actionRuns).find(run => run.id === parseInt(params.id));

  return { actionRun, user };
};
