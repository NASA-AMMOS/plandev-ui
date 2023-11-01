import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  const {
    modelMap: initialModelMap,
    models: initialModels,
    planMap: initialPlanMap,
    plans: initialPlans,
  } = await effects.getPlansAndModelsForConstraints(user);

  return {
    initialModelMap,
    initialModels,
    initialPlanMap,
    initialPlans,
    user,
  };
};
