import effects from '../../../utilities/effects';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { workspaceId } = params;

  const initialWorkspace = await effects.getWorkspace(parseInt(workspaceId), user);

  return {
    initialWorkspace,
    user,
  };
};
