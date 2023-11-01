import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: conditionIdParam } = params;
  const { models = [], plans = [] } = await effects.getPlansAndModelsForScheduling(user);

  if (conditionIdParam !== null && conditionIdParam !== undefined) {
    const conditionId = parseFloatOrNull(conditionIdParam);
    const initialCondition = await effects.getSchedulingCondition(conditionId, user);
    const schedulingSpecConditions = await effects.getSchedulingSpecConditionsForCondition(conditionId, user);

    if (initialCondition !== null) {
      return {
        initialCondition,
        initialSpecId: schedulingSpecConditions?.[0]?.specification_id,
        models,
        plans,
        user,
      };
    }
  }

  throw redirect(302, `${base}/scheduling/conditions`);
};
