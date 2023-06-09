import { base } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type {
  PlanMergeConflictingActivity,
  PlanMergeNonConflictingActivity,
  PlanMergeRequestSchema,
} from '../../../../types/plan';
import effects from '../../../../utilities/effects';
import { hasNoAuthorization } from '../../../../utilities/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
  const { user } = await parent();

  if (env.PUBLIC_LOGIN_PAGE === 'enabled' && (!user || hasNoAuthorization(user))) {
    throw redirect(302, `${base}/login`);
  }

  const { id } = params;
  const planId = parseFloat(id);

  if (!Number.isNaN(planId)) {
    const initialPlan = await effects.getPlan(planId, user);

    if (initialPlan) {
      if (!initialPlan.is_locked) {
        throw redirect(302, `${base}/plans/${id}`);
      }

      const initialMergeRequest: PlanMergeRequestSchema | null = await effects.getPlanMergeRequestInProgress(
        planId,
        user,
      );
      let initialConflictingActivities: PlanMergeConflictingActivity[] = [];
      let initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [];

      if (initialMergeRequest) {
        const { id: mergeRequestId } = initialMergeRequest;
        initialConflictingActivities = await effects.getPlanMergeConflictingActivities(mergeRequestId, user);
        initialNonConflictingActivities = await effects.getPlanMergeNonConflictingActivities(mergeRequestId, user);
      }

      return {
        initialConflictingActivities,
        initialMergeRequest,
        initialNonConflictingActivities,
        initialPlan,
        user,
      };
    }
  }

  throw redirect(302, `${base}/plans`);
};
