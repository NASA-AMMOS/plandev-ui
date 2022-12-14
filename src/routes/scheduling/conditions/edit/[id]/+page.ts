import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { id: conditionIdParam } = params;

  if (conditionIdParam !== null && conditionIdParam !== undefined) {
    const conditionId = parseFloatOrNull(conditionIdParam);
    const initialCondition = await effects.getSchedulingCondition(conditionId);
    const initialModels = await effects.getModels();

    if (initialCondition !== null) {
      return {
        initialCondition,
        initialModels,
      };
    }
  }

  throw redirect(302, `${base}/scheduling/conditions`);
};
