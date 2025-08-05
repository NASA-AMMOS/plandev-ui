import { browser } from '$app/environment';
import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { userStore } from '../../../../../../lib/stores/auth';
import type { User } from '../../../../../../types/app';
import effects from '../../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  let user: User | null;
  if (browser) {
    user = (await parent()).user;
  } else {
    user = get(userStore);
  }

  const { id: goalIdParam } = params;

  if (goalIdParam !== null) {
    const goalId = parseFloatOrNull(goalIdParam);

    if (goalId !== null) {
      const initialGoal = await effects.getSchedulingGoal(goalId, user);

      if (initialGoal !== null) {
        return {
          initialGoal,
          user,
        };
      }
    }
  }

  redirect(302, `${base}/scheduling/goals`);
};
