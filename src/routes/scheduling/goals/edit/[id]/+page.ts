import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import { hasNoAuthorization } from '../../../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user, permissibleQueries } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(permissibleQueries))) {
    throw redirect(302, `${base}/login`);
  }

  const { id: goalIdParam } = params;
  const { models = [], plans = [] } = await effects.getPlansAndModelsForScheduling();

  if (goalIdParam !== null && goalIdParam !== undefined) {
    const goalId = parseFloatOrNull(goalIdParam);
    const initialGoal = await effects.getSchedulingGoal(goalId);
    const schedulingSpecGoals = await effects.getSchedulingSpecGoalsForGoal(goalId);

    if (initialGoal !== null) {
      return {
        initialGoal,
        initialSpecId: schedulingSpecGoals?.[0]?.specification_id,
        models,
        plans,
      };
    }
  }

  throw redirect(302, `${base}/scheduling/goals`);
};
