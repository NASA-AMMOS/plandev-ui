import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { userStore } from '../../../../../../lib/stores/auth';
import type { User } from '../../../../../../types/app';
import effects from '../../../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  let user: User | null;
  if (browser) {
    user = get(userStore);
  } else {
    user = (await parent()).user;
  }

  const { id } = params;
  const actionRunId = parseFloat(id);

  if (!Number.isNaN(actionRunId)) {
    const initialActionRun = await effects.getActionRun(actionRunId, user);
    return {
      initialActionRun,
      user,
    };
  }

  return { actionRunId: params.id, user };
};
