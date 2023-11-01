import effects from '../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  const { models = [], plans = [] } = await effects.getPlansAndModelsForScheduling(user);

  return {
    models,
    plans,
    user,
  };
};
