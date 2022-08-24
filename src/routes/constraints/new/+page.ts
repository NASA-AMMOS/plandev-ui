import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const { models: initialModels, plans: initialPlans } = await effects.getPlansAndModels();

  return {
    initialModels,
    initialPlans,
  };
};
