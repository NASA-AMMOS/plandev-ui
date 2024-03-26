import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../../utilities/generic';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  const { id: conditionIdParam } = params;

  if (conditionIdParam !== null && conditionIdParam !== undefined) {
    const conditionId = parseFloatOrNull(conditionIdParam);

    if (conditionId !== null) {
      const initialCondition = await effects.getSchedulingCondition(conditionId, user);
      if (initialCondition !== null) {
        return {
          initialCondition,
          user,
        };
      }
    }
  }

  redirect(302, `${base}/scheduling/conditions`);
};
