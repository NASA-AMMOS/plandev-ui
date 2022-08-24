import effects from '../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const { plans: initialPlans } = await effects.getPlansAndModels();

  return {
    initialPlans,
  };
};
