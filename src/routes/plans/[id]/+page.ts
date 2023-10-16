import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { SearchParameters } from '../../../enums/searchParameters';
import effects from '../../../utilities/effects';
import { getSearchParameterNumber } from '../../../utilities/generic';
import { shouldRedirectToLogin } from '../../../utilities/login';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, url }) => {
  const { user } = await parent();

  if (shouldRedirectToLogin(user)) {
    throw redirect(302, `${base}/login`);
  }

  const { id } = params;
  const planId = parseFloat(id);

  if (!Number.isNaN(planId)) {
    let initialPlan = await effects.getPlan(planId, user);

    if (initialPlan) {
      if (initialPlan.is_locked) {
        throw redirect(302, `${base}/plans/${id}/merge`);
      }

      // if plan doesn't have a scheduling spec, create one at this point
      if (!initialPlan.scheduling_specifications.length) {
        const { start_time_doy, end_time_doy, revision } = initialPlan;
        const schedulingSpec = await effects.createSchedulingSpec(
          {
            analysis_only: false,
            horizon_end: end_time_doy,
            horizon_start: start_time_doy,
            plan_id: planId,
            plan_revision: revision,
            simulation_arguments: {},
          },
          user,
        );

        initialPlan = {
          ...initialPlan,
          scheduling_specifications: schedulingSpec ? [schedulingSpec] : [],
        };
      }

      const initialActivityTypes = await effects.getActivityTypes(initialPlan.model_id, user);
      const initialResourceTypes = await effects.getResourceTypes(initialPlan.model_id, user, 20);
      const initialPlanTags = await effects.getPlanTags(initialPlan.id, user);
      const initialView = await effects.getView(url.searchParams, user, initialActivityTypes, initialResourceTypes);
      const initialPlanSnapshotId = getSearchParameterNumber(SearchParameters.SNAPSHOT_ID, url.searchParams);
      const extensions = await effects.getExtensions(user);

      return {
        extensions,
        initialActivityTypes,
        initialPlan,
        initialPlanSnapshotId,
        initialPlanTags,
        initialView,
        user,
      };
    }
  }

  throw redirect(302, `${base}/plans`);
};
