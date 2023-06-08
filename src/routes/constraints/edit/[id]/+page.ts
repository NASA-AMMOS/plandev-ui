import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import { hasNoAuthorization } from '../../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user, permissibleQueries } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(permissibleQueries))) {
    throw redirect(302, `${base}/login`);
  }

  const { id: constraintIdParam } = params;

  if (constraintIdParam !== null && constraintIdParam !== undefined) {
    const constraintId = parseFloatOrNull(constraintIdParam);

    if (constraintId !== null) {
      const initialConstraint = await effects.getConstraint(constraintId);
      const { models: initialModels, plans: initialPlans } = await effects.getPlansAndModels();

      if (initialConstraint !== null) {
        return {
          initialConstraint,
          initialModels,
          initialPlans,
        };
      }
    }
  }

  throw redirect(302, `${base}/constraints`);
};
