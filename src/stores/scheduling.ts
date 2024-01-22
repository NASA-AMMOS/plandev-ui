import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { plan } from '../stores/plan';
import type {
  SchedulingCondition,
  SchedulingGoalAnalysis,
  SchedulingGoalSlim,
  SchedulingSpecCondition,
  SchedulingSpecGoal,
} from '../types/scheduling';
import gql from '../utilities/gql';
import type { Status } from '../utilities/status';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const schedulingColumns: Writable<string> = writable('2fr 3px 1fr');
export const schedulingFormColumns: Writable<string> = writable('1fr 3px 2fr');
export const schedulingConditionsFormColumns: Writable<string> = writable('1fr 3px 2fr');
export const schedulingGoalsColumns: Writable<string> = writable('1fr 3px 2fr');
export const schedulingStatus: Writable<Status | null> = writable(null);

/* Derived. */

export const selectedSpecId = derived(plan, $plan => $plan?.scheduling_specifications[0]?.id ?? null);

/* Subscriptions. */

export const schedulingConditionsAll = gqlSubscribable<SchedulingCondition[]>(
  gql.SUB_SCHEDULING_CONDITIONS,
  {},
  [],
  null,
);

export const schedulingConditions = derived(
  [selectedSpecId, schedulingConditionsAll],
  ([$selectedSpecId, $schedulingConditionsAll]) => {
    return $schedulingConditionsAll.map(schedulingSpecCondition => {
      return {
        ...schedulingSpecCondition,
        scheduling_specification_conditions: schedulingSpecCondition.scheduling_specification_conditions.filter(
          condition => condition.specification_id === $selectedSpecId,
        ),
      };
    });
  },
);

export const schedulingGoalsAll = gqlSubscribable<SchedulingGoalSlim[]>(gql.SUB_SCHEDULING_GOALS, {}, [], null);

export const schedulingGoals = derived(
  [selectedSpecId, schedulingGoalsAll],
  ([$selectedSpecId, $schedulingGoalsAll]) => {
    return $schedulingGoalsAll
      .filter(goal => goal.scheduling_specification_goal?.specification_id === $selectedSpecId)
      .map(goal => {
        return {
          ...goal,
          analyses: goal.analyses.filter(analysis => analysis.request.specification_id === $selectedSpecId),
        };
      });
  },
);

export const schedulingSpecConditionsAll = gqlSubscribable<SchedulingSpecCondition[]>(
  gql.SUB_SCHEDULING_SPEC_CONDITIONS,
  { specification_id: selectedSpecId },
  [],
  null,
);

export const schedulingSpecConditions = derived(
  [selectedSpecId, schedulingSpecConditionsAll],
  ([$selectedSpecId, $schedulingSpecConditionsAll]) => {
    return $schedulingSpecConditionsAll
      .filter(schedulingSpecCondition => schedulingSpecCondition.specification_id === $selectedSpecId)
      .map(schedulingSpecCondition => {
        return {
          ...schedulingSpecCondition,
          condition: {
            ...schedulingSpecCondition.condition,
            scheduling_specification_conditions:
              schedulingSpecCondition.condition.scheduling_specification_conditions.filter(
                condition => condition.specification_id === $selectedSpecId,
              ),
          },
        };
      });
  },
);

export const schedulingSpecGoalsAll = gqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: selectedSpecId },
  [],
  null,
);

export const schedulingSpecGoals = derived(
  [selectedSpecId, schedulingSpecGoalsAll],
  ([$selectedSpecId, $schedulingSpecGoalsAll]) => {
    return $schedulingSpecGoalsAll
      .filter(schedulingSpecGoal => schedulingSpecGoal.specification_id === $selectedSpecId)
      .map(specGoal => {
        return {
          ...specGoal,
          goal: {
            ...specGoal.goal,
            analyses: specGoal.goal.analyses.filter(analysis => analysis.request.specification_id === $selectedSpecId),
          },
        };
      });
  },
);

export const latestAnalyses = derived(
  [selectedSpecId, schedulingSpecGoals],
  ([$selectedSpecId, $schedulingSpecGoals]) => {
    const analysisIdToSpecGoalMap: Record<number, SchedulingGoalAnalysis[]> = {};
    let latestAnalysisId = -1;

    $schedulingSpecGoals.forEach(schedulingSpecGoal => {
      schedulingSpecGoal.goal.analyses.forEach(analysis => {
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

export const schedulingGoalCount = derived(latestAnalyses, $latestAnalyses => Object.keys($latestAnalyses).length);
export const satisfiedSchedulingGoalCount = derived(
  latestAnalyses,
  $latestAnalyses => Object.values($latestAnalyses).filter(analysis => analysis.satisfied).length,
);

export const enableScheduling: Readable<boolean> = derived([schedulingSpecGoals], ([$schedulingSpecGoals]) => {
  return $schedulingSpecGoals.filter(schedulingSpecGoal => schedulingSpecGoal.enabled).length > 0;
});

/* Helper Functions. */

export function resetSchedulingStores() {
  schedulingStatus.set(null);
}
