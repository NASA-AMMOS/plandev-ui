import effects from '../../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id } = params;
  const actionRunId = parseFloat(id);

  if (!Number.isNaN(actionRunId)) {
    const initialActionRun = await effects.getActionRun(actionRunId, user);
    return {
      initialActionRun,
      user,
    };
  }

  return { actionRunId: params.id, user };
};
