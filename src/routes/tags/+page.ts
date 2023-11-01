import effects from '../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent();

  const initialTags = await effects.getTags(user);

  return {
    initialTags,
    user,
  };
};
