import { browser } from '$app/environment';
import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { userStore } from '../../lib/stores/auth';
import type { User } from '../../types/app';
import { hasNoAuthorization } from '../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  let user: User | null;
  if (browser) {
    user = get(userStore);
  } else {
    user = (await parent()).user;
  }

  if (user && !hasNoAuthorization(user)) {
    redirect(302, `${base}/plans`);
  }

  return { user };
};
