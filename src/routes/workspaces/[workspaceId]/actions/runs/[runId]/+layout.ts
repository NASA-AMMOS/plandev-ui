import effects from '../../../../../../utilities/effects';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent, params }) => {
  const { user } = await parent();
  const { runId, workspaceId } = params;
  const actionRunId = parseFloat(runId);

  const initialWorkspace = await effects.getWorkspace(parseInt(workspaceId), user);

  if (!Number.isNaN(actionRunId)) {
    const initialActionRun = await effects.getActionRun(actionRunId, user);

    return {
      initialActionRun,
      initialWorkspace,
    };
  }

  return {
    initialActionRun: null,
    initialWorkspace,
  };
};
