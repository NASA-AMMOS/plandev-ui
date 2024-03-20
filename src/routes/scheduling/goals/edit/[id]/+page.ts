import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

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

  throw redirect(302, `${base}/scheduling/goals`);
};
