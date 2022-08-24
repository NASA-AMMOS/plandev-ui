import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
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
