import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import { hasNoAuthorization } from '../../../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(user))) {
    throw redirect(302, `${base}/login`);
  }

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
