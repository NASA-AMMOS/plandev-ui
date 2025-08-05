import { browser } from '$app/environment';
import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { userStore } from '../../../../../../lib/stores/auth';
import type { User } from '../../../../../../types/app';
import effects from '../../../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  let user: User | null;
  if (browser) {
    user = (await parent()).user;
  } else {
    user = get(userStore);
  }

  const { id: ruleIdParam } = params;

  if (ruleIdParam !== null && ruleIdParam !== undefined) {
    const ruleIdAsNumber = parseFloat(ruleIdParam);

    if (!Number.isNaN(ruleIdAsNumber)) {
      const initialRule = await effects.getExpansionRule(ruleIdAsNumber, user);

      if (initialRule !== null) {
        return {
          initialRule,
          user,
        };
      }
    }
  }

  redirect(302, `${base}/expansion/rules`);
};
