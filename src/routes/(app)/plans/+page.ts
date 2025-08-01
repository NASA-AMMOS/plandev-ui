import { get } from 'svelte/store';
import { userStore } from '../../../lib/stores/auth';
import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  console.log('user data token', user?.token);
  console.log('user store token', get(userStore)?.token);

  // TODO: don't run this in server? or any hasura req? should only need to run on client
  const { models = [], plans = [] } = await effects.getPlansAndModels(user);

  return {
    models,
    plans,
    user,
  };
};
