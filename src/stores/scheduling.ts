import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import { plan, planRevision } from '../stores/plan';
import type {
  SchedulingConditionDefinition,
  SchedulingConditionMetadata,
  SchedulingConditionMetadataResponse,
  SchedulingConditionPlanSpecification,
  SchedulingGoalAnalysis,
  SchedulingGoalDefinition,
  SchedulingGoalMetadata,
  SchedulingGoalMetadataResponse,
  SchedulingGoalPlanSpecification,
  SchedulingPlanSpecification,
  SchedulingRequest,
} from '../types/scheduling';
import gql from '../utilities/gql';
import { convertResponseToMetadata } from '../utilities/scheduling';
import { derivedDeeply } from './derivedDeeply';
import { simulationDatasetsPlan } from './simulation';
import { gqlSubscribable } from './subscribable';
import { tags } from './tags';

/* Writeable. */

export const schedulingConditionMetadataId: Writable<number> = writable(-1);
export const schedulingGoalMetadataId: Writable<number> = writable(-1);

export const schedulingColumns: Writable<string> = writable('1fr 3px 1fr');

/* Derived. */

export const selectedSchedulingSpecId = derived(plan, $plan => $plan?.scheduling_specification?.id ?? null);

/* Subscriptions. */

export const schedulingRequests = gqlSubscribable<SchedulingRequest[]>(
  gql.SUB_SCHEDULING_REQUESTS,
  { specId: selectedSchedulingSpecId },
  [],
  null,
);

export const schedulingConditionResponses = gqlSubscribable<SchedulingConditionMetadataResponse[] | null>(
  gql.SUB_SCHEDULING_CONDITIONS,
  {},
  null,
  null,
);

export const schedulingGoalResponses = gqlSubscribable<SchedulingGoalMetadataResponse[] | null>(
  gql.SUB_SCHEDULING_GOALS,
  {},
  null,
  null,
);

export const schedulingConditionResponse = gqlSubscribable<SchedulingConditionMetadataResponse | null>(
  gql.SUB_SCHEDULING_CONDITION,
  { id: schedulingConditionMetadataId },
  null,
  null,
);

export const schedulingGoalResponse = gqlSubscribable<SchedulingGoalMetadataResponse | null>(
  gql.SUB_SCHEDULING_GOAL,
  { id: schedulingGoalMetadataId },
  null,
  null,
);

export const schedulingPlanSpecification = gqlSubscribable<SchedulingPlanSpecification | null>(
  gql.SUB_SCHEDULING_PLAN_SPECIFICATION,
  { specificationId: selectedSchedulingSpecId },
  null,
  null,
);

/* Derived. */
export const schedulingConditions = derivedDeeply(
  [schedulingConditionResponses, tags],
  ([$schedulingConditionResponses, $tags]) => {
    return ($schedulingConditionResponses || []).map(conditionResponse =>
      convertResponseToMetadata<SchedulingConditionMetadata, SchedulingConditionDefinition>(conditionResponse, $tags),
    );
  },
);

export const schedulingGoals = derivedDeeply([schedulingGoalResponses, tags], ([$schedulingGoalResponses, $tags]) => {
  return ($schedulingGoalResponses || []).map(goalResponse =>
    convertResponseToMetadata<SchedulingGoalMetadata, SchedulingGoalDefinition>(goalResponse, $tags),
  );
});

export const schedulingConditionMetadata = derivedDeeply(
  [schedulingConditionResponse, tags],
  ([$schedulingConditionResponse, $tags]) => {
    if ($schedulingConditionResponse) {
      return convertResponseToMetadata<SchedulingConditionMetadata, SchedulingConditionDefinition>(
        $schedulingConditionResponse,
        $tags,
      );
    }
    return null;
  },
);

export const schedulingGoalMetadata = derivedDeeply(
  [schedulingGoalResponse, tags],
  ([$schedulingGoalResponse, $tags]) => {
    if ($schedulingGoalResponse) {
      return convertResponseToMetadata<SchedulingGoalMetadata, SchedulingGoalDefinition>(
        $schedulingGoalResponse,
        $tags,
      );
    }
    return null;
  },
);

export const schedulingConditionsMap: Readable<Record<string, SchedulingConditionMetadata>> = derived(
  [schedulingConditions],
  ([$schedulingConditions]) => keyBy($schedulingConditions, 'id'),
);

export const schedulingGoalsMap: Readable<Record<string, SchedulingGoalMetadata>> = derived(
  [schedulingGoals],
  ([$schedulingGoals]) => keyBy($schedulingGoals, 'id'),
);

export const schedulingConditionSpecifications = derived(
  [schedulingPlanSpecification],
  ([$schedulingPlanSpecification]) => $schedulingPlanSpecification?.conditions ?? null,
);

export const schedulingGoalSpecifications = derived(
  [schedulingPlanSpecification],
  ([$schedulingPlanSpecification]) => $schedulingPlanSpecification?.goals ?? null,
);

export const allowedSchedulingConditionSpecs: Readable<SchedulingConditionPlanSpecification[] | null> = derived(
  [schedulingConditionSpecifications],
  ([$schedulingConditionSpecifications]) =>
    $schedulingConditionSpecifications
      ? $schedulingConditionSpecifications.filter(
          ({ condition_metadata: conditionMetadata }) => conditionMetadata !== null,
        )
      : null,
);

export const allowedSchedulingGoalSpecs: Readable<SchedulingGoalPlanSpecification[] | null> = derived(
  [schedulingGoalSpecifications],
  ([$schedulingGoalSpecifications]) =>
    ($schedulingGoalSpecifications || []).filter(({ goal_metadata: goalMetadata }) => goalMetadata !== null),
);

export const schedulingGoalsLoading = derived(
  [schedulingGoalSpecifications, schedulingGoalResponses],
  ([$schedulingGoalSpecifications, $schedulingGoalResponses]) => {
    return !$schedulingGoalSpecifications || !$schedulingGoalResponses;
  },
);

export const schedulingConditionsLoading = derived(
  [schedulingConditionSpecifications, schedulingConditionResponses],
  ([$schedulingConditionSpecifications, $schedulingConditionResponses]) => {
    return !$schedulingConditionSpecifications || !$schedulingConditionResponses;
  },
);

export const latestSchedulingGoalAnalyses = derived(
  [selectedSchedulingSpecId, schedulingGoalSpecifications],
  ([$selectedSpecId, $schedulingGoalSpecifications]) => {
    const analysisIdToSpecGoalMap: Record<number, SchedulingGoalAnalysis[]> = {};
    let latestAnalysisId = -1;

    ($schedulingGoalSpecifications || []).forEach(schedulingSpecGoal => {
      let analyses: SchedulingGoalAnalysis[] = [];
      if (schedulingSpecGoal.goal_definition != null) {
        analyses = schedulingSpecGoal.goal_definition.analyses ?? [];
      } else {
        analyses = schedulingSpecGoal.goal_metadata?.versions[0].analyses ?? [];
      }

      analyses.forEach(analysis => {
        if (analysis.request.specification_id !== $selectedSpecId) {
          return;
        }
        if (!analysisIdToSpecGoalMap[analysis.analysis_id]) {
          analysisIdToSpecGoalMap[analysis.analysis_id] = [];
        }
        analysisIdToSpecGoalMap[analysis.analysis_id].push(analysis);
        if (analysis.analysis_id > latestAnalysisId) {
          latestAnalysisId = analysis.analysis_id;
        }
      });
    });

    return analysisIdToSpecGoalMap[latestAnalysisId] || [];
  },
);

export const latestSchedulingRequest = derived([schedulingRequests], ([$schedulingRequests]) => {
  return $schedulingRequests[0] || null;
});

export const schedulingGoalCount = derived(
  latestSchedulingGoalAnalyses,
  $latestSchedulingGoalAnalyses => Object.keys($latestSchedulingGoalAnalyses).length,
);
export const satisfiedSchedulingGoalCount = derived(
  latestSchedulingGoalAnalyses,
  $latestSchedulingGoalAnalyses =>
    Object.values($latestSchedulingGoalAnalyses).filter(analysis => analysis.satisfied).length,
);

export const schedulingAnalysisStatus = derived(
  [
    latestSchedulingRequest,
    latestSchedulingGoalAnalyses,
    schedulingPlanSpecification,
    planRevision,
    schedulingGoalCount,
    schedulingGoals,
    satisfiedSchedulingGoalCount,
    simulationDatasetsPlan,
  ],
  ([
    $latestSchedulingRequest,
    $latestSchedulingGoalAnalyses,
    $schedulingPlanSpecification,
    $planRevision,
    $schedulingGoalCount,
    $schedulingGoals,
    $satisfiedSchedulingGoalCount,
    $simulationDatasetsPlan,
  ]) => {
    // No status if there are no requests
    if (!$latestSchedulingRequest || $schedulingGoals.length < 1) {
      return null;
    } else if ($latestSchedulingRequest.canceled) {
      return Status.Canceled;
    } else if ($latestSchedulingRequest.status === 'incomplete') {
      return Status.Incomplete;
    } else if ($latestSchedulingRequest.status === 'pending' && !$latestSchedulingRequest.canceled) {
      return Status.Pending;
    } else {
      let matchingSimDataset;
      if (typeof $latestSchedulingRequest.dataset_id === 'number') {
        matchingSimDataset = ($simulationDatasetsPlan || []).find(
          d => d.dataset_id === $latestSchedulingRequest.dataset_id,
        );
      }

      /*
        Stale if:
        - the latest scheduling request specifies a dataset id and the matching sim dataset's plan revision does not match the current plan revision
        - the latest scheduling request does not specify a dataset id and the scheduling spec's plan revision does not match the current plan revision
        - the scheduling spec revision does not match latest scheduling request revision
      */
      let schedulingPlanRevOutdated = false;
      if (matchingSimDataset) {
        schedulingPlanRevOutdated = !!matchingSimDataset && matchingSimDataset.plan_revision !== $planRevision;
      } else {
        schedulingPlanRevOutdated =
          !!$schedulingPlanSpecification && $schedulingPlanSpecification?.plan_revision !== $planRevision;
      }

      if (
        schedulingPlanRevOutdated ||
        ($schedulingPlanSpecification &&
          $schedulingPlanSpecification.revision !== $latestSchedulingRequest.specification_revision)
      ) {
        return Status.Modified;
      } else if ($latestSchedulingRequest.status === 'failed') {
        return Status.Failed;
      } else if ($latestSchedulingRequest.status === 'success' && $latestSchedulingGoalAnalyses) {
        // If not all activities were satisfied, mark the status as failed
        if ($schedulingGoalCount !== $satisfiedSchedulingGoalCount) {
          return Status.Failed;
        } else {
          return Status.Complete;
        }
      }
    }
    return Status.Pending;
  },
);

export const enableScheduling: Readable<boolean> = derived(
  [schedulingGoalSpecifications],
  ([$schedulingGoalSpecifications]) => {
    return ($schedulingGoalSpecifications || []).filter(schedulingSpecGoal => schedulingSpecGoal.enabled).length > 0;
  },
);

export function resetPlanSchedulingStores() {
  schedulingPlanSpecification.updateValue(() => null);
}
