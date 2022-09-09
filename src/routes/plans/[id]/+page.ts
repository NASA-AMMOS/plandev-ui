import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { user as userStore } from '../../../stores/app';
import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
  const user = get(userStore);

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { id } = params;
  const planId = parseFloat(id);

  if (!Number.isNaN(planId)) {
    const initialPlan = await effects.getPlan(planId);

    if (initialPlan) {
      const initialView = await effects.getView(user.id, url.searchParams);

      return {
        initialPlan,
        initialView,
      };
    }
  }

  throw redirect(302, `${base}/plans`);
};
