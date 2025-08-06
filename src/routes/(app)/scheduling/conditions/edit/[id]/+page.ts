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
    user = get(userStore);
  } else {
    user = (await parent()).user;
  }

  const { id: conditionIdParam } = params;

  if (conditionIdParam !== null && conditionIdParam !== undefined) {
    const conditionId = parseFloatOrNull(conditionIdParam);

    if (conditionId !== null) {
      const initialCondition = await effects.getSchedulingCondition(conditionId, user);
      if (initialCondition !== null) {
        return {
          initialCondition,
          user,
        };
      }
    }
  }

  redirect(302, `${base}/scheduling/conditions`);
};
