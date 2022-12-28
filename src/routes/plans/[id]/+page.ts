import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, url }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { id } = params;
  const planId = parseFloat(id);

  if (!Number.isNaN(planId)) {
    const initialPlan = await effects.getPlan(planId);

    if (initialPlan) {
      if (initialPlan.is_locked) {
        throw redirect(302, `${base}/plans/${id}/merge`);
      }
      const initialActivityTypes = await effects.getActivityTypes(initialPlan.model_id);
      const initialResourceTypes = await effects.getResourceTypes(initialPlan.model_id);
      const initialView = await effects.getView(url.searchParams, initialResourceTypes);

      return {
        initialActivityTypes,
        initialPlan,
        initialView,
      };
    }
  }

  throw redirect(302, `${base}/plans`);
};
