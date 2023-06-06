import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user, permissibleQueries } = await parent();

  if (!user || (permissibleQueries && !Object.keys(permissibleQueries).length)) {
    throw redirect(302, `${base}/login`);
  }

  const { id: conditionIdParam } = params;
  const { models = [], plans = [] } = await effects.getPlansAndModelsForScheduling();

  if (conditionIdParam !== null && conditionIdParam !== undefined) {
    const conditionId = parseFloatOrNull(conditionIdParam);
    const initialCondition = await effects.getSchedulingCondition(conditionId);
    const schedulingSpecConditions = await effects.getSchedulingSpecConditionsForCondition(conditionId);

    if (initialCondition !== null) {
      return {
        initialCondition,
        initialSpecId: schedulingSpecConditions?.[0]?.specification_id,
        models,
        plans,
      };
    }
  }

  throw redirect(302, `${base}/scheduling/conditions`);
};
