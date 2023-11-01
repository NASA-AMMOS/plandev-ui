import effects from '../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  const {
    modelMap: initialModelMap,
    planMap: initialPlanMap,
    plans: initialPlans,
  } = await effects.getPlansAndModelsForConstraints(user);

  return {
    initialModelMap,
    initialPlanMap,
    initialPlans,
    user,
  };
};
