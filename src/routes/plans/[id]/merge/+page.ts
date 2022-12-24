import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type {
  PlanMergeConflictingActivity,
  PlanMergeNonConflictingActivity,
  PlanMergeRequestSchema,
} from '../../../../types/plan';
import effects from '../../../../utilities/effects';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (!user) {
    throw redirect(302, `${base}/login`);
  }

  const { id } = params;
  const planId = parseFloat(id);

  if (!Number.isNaN(planId)) {
    const initialPlan = await effects.getPlan(planId);

    if (initialPlan) {
      if (!initialPlan.is_locked) {
        throw redirect(302, `${base}/plans/${id}`);
      }

      const initialMergeRequest: PlanMergeRequestSchema = await effects.getPlanMergeRequestInProgress(planId);
      let initialConflictingActivities: PlanMergeConflictingActivity[] = [];
      let initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [];

      if (initialMergeRequest) {
        const { id: mergeRequestId } = initialMergeRequest;
        initialConflictingActivities = await effects.getPlanMergeConflictingActivities(mergeRequestId);
        initialNonConflictingActivities = await effects.getPlanMergeNonConflictingActivities(mergeRequestId);
      }

      return {
        initialConflictingActivities,
        initialMergeRequest,
        initialNonConflictingActivities,
        initialPlan,
      };
    }
  }

  throw redirect(302, `${base}/plans`);
};
