import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: constraintIdParam } = params;

  if (constraintIdParam !== null && constraintIdParam !== undefined) {
    const constraintId = parseFloatOrNull(constraintIdParam);

    if (constraintId !== null) {
      const initialConstraint = await effects.getConstraint(constraintId, user);
      const {
        modelMap: initialModelMap,
        models: initialModels,
        planMap: initialPlanMap,
        plans: initialPlans,
      } = await effects.getPlansAndModelsForConstraints(user);

      if (initialConstraint !== null) {
        return {
          initialConstraint,
          initialModelMap,
          initialModels,
          initialPlanMap,
          initialPlans,
          user,
        };
      }
    }
  }

  throw redirect(302, `${base}/constraints`);
};
