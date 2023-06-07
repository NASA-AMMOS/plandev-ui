import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import effects from '../../../utilities/effects';
import { hasNoAuthorization } from '../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, url }) => {
  const { user, permissibleQueries } = await parent();

  if (!user || hasNoAuthorization(permissibleQueries)) {
    throw redirect(302, `${base}/login`);
  }

  const { id } = params;
  const planId = parseFloat(id);

  if (!Number.isNaN(planId)) {
    let initialPlan = await effects.getPlan(planId);

    if (initialPlan) {
      if (initialPlan.is_locked) {
        throw redirect(302, `${base}/plans/${id}/merge`);
      }

      // if plan doesn't have a scheduling spec, create one at this point
      if (!initialPlan.scheduling_specifications.length) {
        const { start_time_doy, end_time_doy, revision } = initialPlan;
        const schedulingSpec = await effects.createSchedulingSpec({
          analysis_only: false,
          horizon_end: end_time_doy,
          horizon_start: start_time_doy,
          plan_id: planId,
          plan_revision: revision,
          simulation_arguments: {},
        });

        initialPlan = {
          ...initialPlan,
          scheduling_specifications: schedulingSpec ? [schedulingSpec] : [],
        };
      }

      const initialActivityTypes = await effects.getActivityTypes(initialPlan.model_id);
      const initialView = await effects.getView(url.searchParams, initialActivityTypes, []);

      return {
        initialActivityTypes,
        initialPlan,
        initialView,
      };
    }
  }

  throw redirect(302, `${base}/plans`);
};
