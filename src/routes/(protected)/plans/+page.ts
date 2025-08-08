import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { userStore } from '../../../lib/stores/auth';
import type { User } from '../../../types/app';
import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  let user: User | null;
  if (browser) {
    user = get(userStore);
  } else {
    user = (await parent()).user;
  }

  const { models = [], plans = [] } = await effects.getPlansAndModels(user);

  return {
    models,
    plans,
    user,
  };
};
