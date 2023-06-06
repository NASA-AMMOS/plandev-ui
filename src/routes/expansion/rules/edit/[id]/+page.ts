import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user, permissibleQueries } = await parent();

  if (!user || (permissibleQueries && !Object.keys(permissibleQueries).length)) {
    throw redirect(302, `${base}/login`);
  }

  const { id: ruleIdParam } = params;

  if (ruleIdParam !== null && ruleIdParam !== undefined) {
    const ruleIdAsNumber = parseFloat(ruleIdParam);
    const initialRule = await effects.getExpansionRule(ruleIdAsNumber);

    if (initialRule !== null) {
      return {
        initialRule,
      };
    }
  }

  throw redirect(302, `${base}/expansion/rules`);
};
