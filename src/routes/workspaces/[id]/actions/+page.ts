import effects from '../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: workspaceId } = params;

  const initialWorkspace = await effects.getWorkspace(parseInt(workspaceId), user);

  return {
    initialWorkspace,
    user,
  };
};
