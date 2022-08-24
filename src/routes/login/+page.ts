import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { user as userStore } from '../../stores/app';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const user = get(userStore);

  if (user) {
    throw redirect(302, `${base}/plans`);
  }

  return {};
};
