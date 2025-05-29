import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: workspaceId } = params;

  const initialWorkspace = await effects.getWorkspace(parseInt(workspaceId), user);

  if (initialWorkspace) {
    return {
      initialWorkspace,
      user,
    };
  }

  return {
    user,
  };
};
