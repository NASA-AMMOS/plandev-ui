import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import { hasNoAuthorization } from '../../../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(user))) {
    throw redirect(302, `${base}/login`);
  }

  const { id: ruleIdParam } = params;

  if (ruleIdParam !== null && ruleIdParam !== undefined) {
    const ruleIdAsNumber = parseFloat(ruleIdParam);
    const initialRule = await effects.getExpansionRule(ruleIdAsNumber, user);

    if (initialRule !== null) {
      return {
        initialRule,
        user,
      };
    }
  }

  throw redirect(302, `${base}/expansion/rules`);
};
