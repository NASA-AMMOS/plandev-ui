import { keyBy } from 'lodash-es';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type {
  ConstraintInvocationMap,
  ConstraintMetadata,
  ConstraintPlanSpecification,
  ConstraintResponse,
  ConstraintResult,
  ConstraintResultWithName,
  ConstraintRun,
} from '../types/constraint';
import gql from '../utilities/gql';
import { planId, planStartTimeMs } from './plan';
import { simulationDatasetLatestId } from './simulation';
import { gqlSubscribable } from './subscribable';

type ConstraintPlanSpecMap = ConstraintInvocationMap<ConstraintPlanSpecification>;
type ConstraintPlanSpecVisibilityMap = ConstraintInvocationMap<boolean>;

/* Writeable. */

export const constraintMetadataId: Writable<number> = writable(-1);

export const constraintPlanSpecVisibilityMapWritable: Writable<ConstraintPlanSpecVisibilityMap> = writable({});

export const rawCheckConstraintsStatus: Writable<Status | null> = writable(null);
export const rawConstraintResponses: Writable<ConstraintResponse[]> = writable([]);

export const constraintsColumns: Writable<string> = writable('1fr 3px 1fr');

/* Subscriptions. */

export const constraints = gqlSubscribable<ConstraintMetadata[] | null>(gql.SUB_CONSTRAINTS, {}, null, null);

export const constraintRuns = gqlSubscribable<ConstraintRun[] | null>(
  gql.SUB_CONSTRAINT_RUNS,
  { simulationDatasetId: simulationDatasetLatestId },
  null,
  null,
);

export const constraintPlanSpecs = gqlSubscribable<ConstraintPlanSpecification[] | null>(
  gql.SUB_CONSTRAINT_PLAN_SPECIFICATIONS,
  { planId },
  null,
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

export const constraintPlanSpecsMap: Readable<Record<string, ConstraintPlanSpecification>> = derived(
  [constraintPlanSpecs],
  ([$constraintPlanSpecs]) => ($constraintPlanSpecs ? keyBy($constraintPlanSpecs, 'constraint_id') : {}),
);

export const allowedConstraintPlanSpecs: Readable<ConstraintPlanSpecification[]> = derived(
  [constraintPlanSpecs],
  ([$constraintPlanSpecs]) =>
    ($constraintPlanSpecs || []).filter(({ constraint_metadata: constraintMetadata }) => constraintMetadata !== null),
);

export const allowedConstraintPlanSpecMap: Readable<ConstraintPlanSpecMap> = derived(
  [allowedConstraintPlanSpecs],
  ([$allowedConstraintSpecs]) =>
    $allowedConstraintSpecs.reduce((prevPlanSpecMap: ConstraintPlanSpecMap, allowedSpec) => {
      if (!prevPlanSpecMap[allowedSpec.constraint_id]) {
        prevPlanSpecMap[allowedSpec.constraint_id] = {};
      }
      prevPlanSpecMap[allowedSpec.constraint_id][allowedSpec.invocation_id] = allowedSpec;
      return prevPlanSpecMap;
    }, {}),
);

export const constraintVisibilityMap: Readable<ConstraintPlanSpecVisibilityMap> = derived(
  [allowedConstraintPlanSpecMap, constraintPlanSpecVisibilityMapWritable],
  ([$allowedConstraintPlanSpecMap, $constraintVisibilityMapWritable]) => {
    return Object.keys($allowedConstraintPlanSpecMap).reduce(
      (prevConstraintPlanSpecVisibilityMap: ConstraintPlanSpecVisibilityMap, constraintIdString: string) => {
        const constraintId: number = parseInt(constraintIdString);
        const invocationPlanSpecMap = $allowedConstraintPlanSpecMap[constraintId];
        if (!prevConstraintPlanSpecVisibilityMap[constraintId]) {
          prevConstraintPlanSpecVisibilityMap[constraintId] = {};
        }
        Object.values(invocationPlanSpecMap).forEach(constraintSpecification => {
          const invocationId = constraintSpecification.invocation_id;
          prevConstraintPlanSpecVisibilityMap[constraintId][invocationId] =
            $constraintVisibilityMapWritable[constraintId]?.[invocationId] ?? true;
        });

        return prevConstraintPlanSpecVisibilityMap;
      },
      {},
    );
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

export const constraintResponses: Readable<ConstraintResponse[]> = derived(
  [constraintRuns, relevantRawConstraintResponses, planStartTimeMs],
  ([$constraintRuns, $checkConstraintResponse, $planStartTimeMs]) => {
    return ($constraintRuns || [])
      .map(
        run =>
          ({
            constraintId: run.constraint_id,
            constraintInvocationId: run.constraint_invocation_id,
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
      )
      .concat(
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
      );
  },
);

export const constraintResponseMap: Readable<
  Record<ConstraintRun['constraint_id'], Record<ConstraintRun['constraint_invocation_id'], ConstraintResponse>>
> = derived([constraintResponses], ([$constraintResponses]) => {
  return $constraintResponses.reduce(
    (prevCachedConstraintResponseMap: ConstraintInvocationMap<ConstraintResponse>, response) => {
      const { constraintId, constraintInvocationId } = response;
      if (!prevCachedConstraintResponseMap[constraintId]) {
        prevCachedConstraintResponseMap[constraintId] = {};
      }
      prevCachedConstraintResponseMap[constraintId][constraintInvocationId] = response;

      return prevCachedConstraintResponseMap;
    },
    {},
  );
});

export const uncheckedConstraintCount: Readable<number> = derived(
  [allowedConstraintPlanSpecs, constraintResponseMap],
  ([$allowedConstraintPlanSpecs, $constraintResponseMap]) =>
    $allowedConstraintPlanSpecs.reduce((count, prev) => {
      if (!(prev.constraint_id in $constraintResponseMap)) {
        count++;
      }
      return count;
    }, 0),
);

export const relevantConstraintRuns: Readable<ConstraintRun[]> = derived(
  [constraintRuns, constraintPlanSpecsMap],
  ([$constraintRuns, $constraintPlanSpecsMap]) => {
    return ($constraintRuns || []).filter(constraintRun => {
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
  [constraintResponses, constraintVisibilityMap],
  ([$constraintResponses, $constraintVisibilityMap]) => {
    return $constraintResponses
      .filter(constraintResponse => {
        return $constraintVisibilityMap[constraintResponse.constraintId]?.[constraintResponse.constraintInvocationId];
      })
      .map(constraintResponse => {
        return {
          ...constraintResponse.results,
          constraintName: constraintResponse.constraintName,
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

/* Loading stores */

export const initialConstraintsLoading: Readable<boolean> = derived([constraints], ([$constraints]) => !$constraints);

export const initialConstraintRunsLoading: Readable<boolean> = derived(
  [constraintRuns],
  ([$constraintRuns]) => !$constraintRuns,
);

export const initialConstraintPlanSpecsLoading: Readable<boolean> = derived(
  [constraintPlanSpecs],
  ([$constraintPlanSpecs]) => !$constraintPlanSpecs,
);

/* Helper Functions. */

export function setConstraintVisibility(
  constraintId: ConstraintPlanSpecification['constraint_id'],
  invocationId: ConstraintPlanSpecification['invocation_id'],
  visible: boolean,
) {
  const visibilityMap = get(constraintPlanSpecVisibilityMapWritable);
  constraintPlanSpecVisibilityMapWritable.set({
    ...visibilityMap,
    [constraintId]: {
      ...(visibilityMap[constraintId] ?? {}),
      [invocationId]: visible,
    },
  });
}

export function setAllConstraintsVisible(visible: boolean) {
  constraintPlanSpecVisibilityMapWritable.set(
    (get(constraintPlanSpecs) || []).reduce(
      (
        prevConstraintPlanSpecVisibilityMap: ConstraintPlanSpecVisibilityMap,
        { constraint_id: constraintId, invocation_id: invocationId }: ConstraintPlanSpecification,
      ) => {
        if (!prevConstraintPlanSpecVisibilityMap[constraintId]) {
          prevConstraintPlanSpecVisibilityMap[constraintId] = {};
        }
        prevConstraintPlanSpecVisibilityMap[constraintId][invocationId] = visible;

        return prevConstraintPlanSpecVisibilityMap;
      },
      {},
    ),
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
