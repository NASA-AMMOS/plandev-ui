import { keyBy } from 'lodash-es';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type {
  ConstraintDefinition,
  ConstraintMetadata,
  ConstraintPlanSpec,
  ConstraintResponse,
  ConstraintResult,
  ConstraintResultWithName,
  ConstraintRun,
} from '../types/constraint';
import gql from '../utilities/gql';
import { planId, planStartTimeMs } from './plan';
import { simulationDatasetLatestId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const constraintMetadataId: Writable<number> = writable(-1);

export const constraintVisibilityMapWritable: Writable<Record<ConstraintMetadata['id'], boolean>> = writable({});

export const rawCheckConstraintsStatus: Writable<Status | null> = writable(null);
export const rawConstraintResponses: Writable<ConstraintResponse[]> = writable([]);

export const constraintsColumns: Writable<string> = writable('1fr 3px 1fr');

/* Subscriptions. */

export const constraints = gqlSubscribable<ConstraintMetadata[]>(gql.SUB_CONSTRAINTS, {}, [], null);

export const constraintRuns = gqlSubscribable<ConstraintRun[]>(
  gql.SUB_CONSTRAINT_RUNS,
  { simulationDatasetId: simulationDatasetLatestId },
  [],
  null,
);

export const constraintPlanSpecs = gqlSubscribable<ConstraintPlanSpec[]>(
  gql.SUB_CONSTRAINT_PLAN_SPECIFICATIONS,
  { planId },
  [],
  null,
);

export const constraintMetadata = gqlSubscribable<ConstraintMetadata | null>(
  gql.SUB_CONSTRAINT,
  { id: constraintMetadataId },
  null,
  null,
);

/* Derived. */
export const constraintsMap: Readable<Record<string, ConstraintMetadata>> = derived([constraints], ([$constraints]) =>
  keyBy($constraints, 'id'),
);

export const constraintPlanSpecsMap: Readable<Record<string, ConstraintPlanSpec>> = derived(
  [constraintPlanSpecs],
  ([$constraintPlanSpecs]) => keyBy($constraintPlanSpecs, 'constraint_id'),
);

export const allowedConstraintSpecs: Readable<ConstraintPlanSpec[]> = derived(
  [constraintPlanSpecs],
  ([$constraintPlanSpecs]) =>
    $constraintPlanSpecs.filter(({ constraint_metadata: constraintMetadata }) => constraintMetadata !== null),
);

export const allowedConstraintPlanSpecMap: Readable<Record<string, ConstraintPlanSpec>> = derived(
  [allowedConstraintSpecs],
  ([$allowedConstraintSpecs]) => keyBy($allowedConstraintSpecs, 'constraint_id'),
);

export const constraintVisibilityMap: Readable<Record<ConstraintMetadata['id'], boolean>> = derived(
  [allowedConstraintPlanSpecMap, constraintVisibilityMapWritable],
  ([$allowedConstraintPlanSpecMap, $constraintVisibilityMapWritable]) => {
    return Object.values($allowedConstraintPlanSpecMap).reduce((map: Record<number, boolean>, constraint) => {
      if (constraint.constraint_id in $constraintVisibilityMapWritable) {
        map[constraint.constraint_id] = $constraintVisibilityMapWritable[constraint.constraint_id];
      } else {
        map[constraint.constraint_id] = true;
      }
      return map;
    }, {});
  },
);

export const relevantRawConstraintResponses: Readable<ConstraintResponse[]> = derived(
  [rawConstraintResponses, constraintPlanSpecsMap],
  ([$rawConstraintResponses, $constraintPlanSpecsMap]) => {
    return $rawConstraintResponses.filter(response => $constraintPlanSpecsMap[response.constraintId] != null);
  },
);

export const constraintsViolationStatus: Readable<Status | null> = derived(
  [relevantRawConstraintResponses],
  ([$relevantRawConstraintResponses]) => {
    if ($relevantRawConstraintResponses.length) {
      const successfulConstraintResults: ConstraintResult[] = $relevantRawConstraintResponses
        .filter(constraintResponse => constraintResponse.success)
        .map(constraintResponse => constraintResponse.results);

      const anyViolations = successfulConstraintResults.reduce((bool, prev) => {
        if (prev.violations && prev.violations.length > 0) {
          bool = true;
        }
        return bool;
      }, false);

      if (successfulConstraintResults.length !== $relevantRawConstraintResponses.length) {
        return Status.Failed;
      }

      return anyViolations ? Status.Failed : Status.Complete;
    }
    return null;
  },
);

export const constraintResponseMap: Readable<Record<ConstraintDefinition['constraint_id'], ConstraintResponse>> =
  derived(
    [constraintRuns, relevantRawConstraintResponses, planStartTimeMs],
    ([$constraintRuns, $checkConstraintResponse, $planStartTimeMs]) => {
      const cachedResponseMap = keyBy(
        $constraintRuns.map(
          run =>
            ({
              constraintId: run.constraint_id,
              constraintName: run.constraint_metadata.name,
              errors: [],
              results: {
                ...run.results,
                violations:
                  run.results.violations?.map(violation => ({
                    ...violation,
                    windows: violation.windows.map(({ end, start }) => ({
                      end: $planStartTimeMs + end / 1000,
                      start: $planStartTimeMs + start / 1000,
                    })),
                  })) ?? null,
              },
              success: true,
              type: 'plan',
            }) as ConstraintResponse,
        ),
        'constraintId',
      );
      const checkConstraintResponse = keyBy(
        $checkConstraintResponse.map(response => ({
          ...response,
          results: {
            ...response.results,
            violations:
              response.results.violations?.map(violation => ({
                ...violation,
                windows: violation.windows.map(({ end, start }) => ({
                  end: $planStartTimeMs + end / 1000,
                  start: $planStartTimeMs + start / 1000,
                })),
              })) ?? null,
          },
        })),
        'constraintId',
      );

      return {
        ...cachedResponseMap,
        ...checkConstraintResponse,
      };
    },
  );

export const uncheckedConstraintCount: Readable<number> = derived(
  [allowedConstraintSpecs, constraintResponseMap],
  ([$allowedConstraintSpecs, $constraintResponseMap]) =>
    $allowedConstraintSpecs.reduce((count, prev) => {
      if (!(prev.constraint_id in $constraintResponseMap)) {
        count++;
      }
      return count;
    }, 0),
);

export const relevantConstraintRuns: Readable<ConstraintRun[]> = derived(
  [constraintRuns, constraintPlanSpecsMap],
  ([$constraintRuns, $constraintPlanSpecsMap]) => {
    return $constraintRuns.filter(constraintRun => {
      const constraintPlanSpec = $constraintPlanSpecsMap[constraintRun.constraint_id];
      let revision = -1;

      if (constraintPlanSpec) {
        if (constraintPlanSpec.constraint_revision === null) {
          revision =
            constraintPlanSpec.constraint_metadata?.versions[
              (constraintPlanSpec.constraint_metadata?.versions.length ?? 0) - 1
            ]?.revision ?? -1;
        } else {
          revision = constraintPlanSpec.constraint_revision;
        }
      }

      return revision === constraintRun.constraint_revision;
    });
  },
);

export const visibleConstraintResults: Readable<ConstraintResultWithName[]> = derived(
  [constraintResponseMap, allowedConstraintPlanSpecMap],
  ([$constraintResponseMap, $allowedConstraintPlanSpecMap]) => {
    return Object.values($constraintResponseMap)
      .filter(constraintRun => {
        return $allowedConstraintPlanSpecMap[constraintRun.constraintId];
      })
      .map(constraintRun => {
        return {
          ...constraintRun.results,
          constraintName: constraintRun.constraintName,
        };
      });
  },
);

export const cachedConstraintsStatus: Readable<Status | null> = derived(
  [relevantConstraintRuns, constraintPlanSpecsMap],
  ([$relevantConstraintRuns, $constraintPlanSpecsMap]) => {
    return $relevantConstraintRuns.reduce(
      (status: Status | null, constraintRun: ConstraintRun) => {
        if (constraintRun.results.violations?.length) {
          return Status.Failed;
        } else if (status !== Status.Failed) {
          return Status.Complete;
        }

        return status;
      },
      Object.keys($constraintPlanSpecsMap).length ? Status.Unchecked : null,
    );
  },
);

export const checkConstraintsStatus: Readable<Status | null> = derived(
  [rawCheckConstraintsStatus, cachedConstraintsStatus],
  ([$rawCheckConstraintsStatus, $cachedConstraintsStatus]) => {
    if ($rawCheckConstraintsStatus !== null) {
      return $rawCheckConstraintsStatus;
    }

    if ($cachedConstraintsStatus !== null && $cachedConstraintsStatus !== Status.Unchecked) {
      return Status.Complete;
    }

    return Status.Unchecked;
  },
);

export const constraintsStatus: Readable<Status | null> = derived(
  [cachedConstraintsStatus, constraintsViolationStatus, checkConstraintsStatus, uncheckedConstraintCount],
  ([$cachedConstraintsStatus, $constraintsViolationStatus, $checkConstraintsStatus, $uncheckedConstraintCount]) => {
    if ($checkConstraintsStatus === Status.Incomplete) {
      return Status.Incomplete;
    } else if (!$cachedConstraintsStatus) {
      return null;
    } else if ($cachedConstraintsStatus !== Status.Complete) {
      return $constraintsViolationStatus ?? $cachedConstraintsStatus;
    } else if ($uncheckedConstraintCount > 0) {
      return Status.PartialSuccess;
    }

    return $constraintsViolationStatus ?? $cachedConstraintsStatus;
  },
);

/* Helper Functions. */

export function setConstraintVisibility(constraintId: ConstraintDefinition['constraint_id'], visible: boolean) {
  constraintVisibilityMapWritable.set({ ...get(constraintVisibilityMapWritable), [constraintId]: visible });
}

export function setAllConstraintsVisible(visible: boolean) {
  constraintVisibilityMapWritable.set(
    Object.values(get(constraintsMap)).reduce((map: Record<number, boolean>, constraint) => {
      map[constraint.id] = visible;
      return map;
    }, {}),
  );
}

export function resetPlanConstraintStores() {
  constraintPlanSpecs.updateValue(() => []);
}

export function resetConstraintStores(): void {
  rawCheckConstraintsStatus.set(null);
  rawConstraintResponses.set([]);
}

export function resetConstraintStoresForSimulation(): void {
  rawCheckConstraintsStatus.set(Status.Unchecked);
  rawConstraintResponses.set([]);
}
