import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { id: constraintIdParam } = params;

  if (constraintIdParam !== null && constraintIdParam !== undefined) {
    const constraintId = parseFloatOrNull(constraintIdParam);
    const initialConstraint = await effects.getConstraint(constraintId);
    const { models: initialModels, plans: initialPlans } = await effects.getPlansAndModels();

    if (initialConstraint !== null) {
      return {
        initialConstraint,
        initialModels,
        initialPlans,
      };
    }
  }

  throw redirect(302, `${base}/constraints`);
};
