import { keyBy } from 'lodash-es';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type {
  ConstraintDefinition,
  ConstraintMetadata,
  ConstraintPlanSpec,
  ConstraintResponse,
  ConstraintResultWithName,
} from '../types/constraint';
import gql from '../utilities/gql';
import { planId, planStartTimeMs } from './plan';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const constraintMetadataId: Writable<number> = writable(-1);

export const constraintsViolationStatus: Writable<Status | null> = writable(null);

export const constraintVisibilityMapWritable: Writable<Record<ConstraintMetadata['id'], boolean>> = writable({});

export const checkConstraintsStatus: Writable<Status | null> = writable(null);

export const rawConstraintResponses: Writable<ConstraintResponse[]> = writable([]);

export const constraintsColumns: Writable<string> = writable('1fr 3px 1fr');

/* Subscriptions. */

export const constraints = gqlSubscribable<ConstraintMetadata[]>(gql.SUB_CONSTRAINTS, {}, [], null);

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

export const constraintResponseMap: Readable<Record<ConstraintDefinition['constraint_id'], ConstraintResponse>> =
  derived([rawConstraintResponses, planStartTimeMs], ([$constraintResponses, $planStartTimeMs]) =>
    keyBy(
      $constraintResponses.map(response => ({
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
    ),
  );

export const uncheckedConstraintCount: Readable<number> = derived(
  [allowedConstraintSpecs, constraintResponseMap],
  ([$allowedConstraintSpecs, $constraintResponseMap]) => {
    return $allowedConstraintSpecs.reduce((count, prev) => {
      if (!(prev.constraint_id in $constraintResponseMap)) {
        count++;
      }
      return count;
    }, 0);
  },
);

export const constraintsStatus: Readable<Status | null> = derived(
  [checkConstraintsStatus, constraintsViolationStatus, uncheckedConstraintCount],
  ([$checkConstraintsStatus, $constraintsViolationStatus, $uncheckedConstraintCount]) => {
    if (!$checkConstraintsStatus) {
      return null;
    }
    if ($checkConstraintsStatus !== Status.Complete) {
      return $checkConstraintsStatus;
    }
    if ($uncheckedConstraintCount > 0) {
      return Status.Unchecked;
    }

    return $constraintsViolationStatus;
  },
);

export const visibleConstraintResults: Readable<ConstraintResultWithName[]> = derived(
  [constraintResponseMap, constraintVisibilityMap],
  ([$constraintResponseMap, $constraintVisibilityMap]) =>
    Object.values($constraintResponseMap)
      .filter(response => $constraintVisibilityMap[response.constraintId])
      .map(response => ({
        ...response.results,
        constraintName: response.constraintName,
      })),
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
  checkConstraintsStatus.set(null);
  rawConstraintResponses.set([]);
}

export function resetConstraintStoresForSimulation(): void {
  checkConstraintsStatus.set(Status.Unchecked);
  rawConstraintResponses.set([]);
}
