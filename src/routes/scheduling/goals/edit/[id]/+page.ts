import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: goalIdParam } = params;
  const { models = [], plans = [] } = await effects.getPlansAndModelsForScheduling(user);

  if (goalIdParam !== null && goalIdParam !== undefined) {
    const goalId = parseFloatOrNull(goalIdParam);
    const initialGoal = await effects.getSchedulingGoal(goalId, user);
    const schedulingSpecGoals = await effects.getSchedulingSpecGoalsForGoal(goalId, user);

    if (initialGoal !== null) {
      return {
        initialGoal,
        initialSpecId: schedulingSpecGoals?.[0]?.specification_id,
        models,
        plans,
        user,
      };
    }
  }

  throw redirect(302, `${base}/scheduling/goals`);
};
