import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../utilities/effects';
import { parseFloatOrNull } from '../../../../utilities/generic';
import { hasNoAuthorization } from '../../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(user))) {
    throw redirect(302, `${base}/login`);
  }

  const { id: constraintIdParam } = params;

  if (constraintIdParam !== null && constraintIdParam !== undefined) {
    const constraintId = parseFloatOrNull(constraintIdParam);

    if (constraintId !== null) {
      const initialConstraint = await effects.getConstraint(constraintId, user);
      const { models: initialModels, plans: initialPlans } = await effects.getPlansAndModels(user);

      if (initialConstraint !== null) {
        return {
          initialConstraint,
          initialModels,
          initialPlans,
          user,
        };
      }
    }
  }

  throw redirect(302, `${base}/constraints`);
};
