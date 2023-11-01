import effects from '../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  const { plans: initialPlans } = await effects.getPlansAndModels(user);

  return { initialPlans, user };
};
