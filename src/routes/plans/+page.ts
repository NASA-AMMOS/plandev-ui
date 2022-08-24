import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { user as userStore } from '../../stores/app';
import effects from '../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const user = get(userStore);

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { models = [], plans = [] } = await effects.getPlansAndModels();

  return {
    models,
    plans,
  };
};
