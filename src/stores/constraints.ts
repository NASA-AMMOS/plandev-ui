import { keyBy } from 'lodash-es';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import type {
  Constraint,
  ConstraintViolation,
  ConstraintViolationsMap,
  ConstraintViolationsResponseMap,
} from '../types/constraint';
import gql from '../utilities/gql';
import type { Status } from '../utilities/status';
import { modelId, planId, planStartTimeMs } from './plan';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const constraints = gqlSubscribable<Constraint[]>(gql.SUB_CONSTRAINTS, { modelId, planId }, []);

export const constraintsAll = gqlSubscribable<Constraint[]>(gql.SUB_CONSTRAINTS_ALL, {}, []);

export const constraintsMap: Readable<Record<string, Constraint>> = derived([constraints], ([$constraints]) =>
  keyBy($constraints, 'id'),
);

export const constraintVisibilityMapWritable: Writable<Record<Constraint['id'], boolean>> = writable({});

export const constraintVisibilityMap: Readable<Record<Constraint['id'], boolean>> = derived(
  [constraintsMap, constraintVisibilityMapWritable],
  ([$constraintsMap, $constraintVisibilityMapWritable]) => {
    return Object.values($constraintsMap).reduce((map, constraint) => {
      if (constraint.id in $constraintVisibilityMapWritable) {
        map[constraint.id] = $constraintVisibilityMapWritable[constraint.id];
      } else {
        map[constraint.id] = true;
      }
      return map;
    }, {});
  },
);

export const checkConstraintsStatus: Writable<Status | null> = writable(null);

export const constraintViolationsResponseMap: Writable<ConstraintViolationsResponseMap> = writable({});

export const constraintsColumns: Writable<string> = writable('1fr 3px 2fr');

/* Derived. */

export const sanitizeConstraintName = (constraintName: string) => {
  return constraintName.indexOf('plan/') > -1 || constraintName.indexOf('model/') > -1
    ? constraintName.replace('plan/', '').replace('model/', '')
    : constraintName;
};

export const constraintViolationsMap: Readable<ConstraintViolationsMap> = derived(
  [constraintViolationsResponseMap, planStartTimeMs, constraints],
  ([$constraintViolationsResponseMap, $planStartTimeMs, $constraints]) =>
    Object.entries($constraintViolationsResponseMap).reduce((map, [constraintName, violations]) => {
      // TODO remove this name translation once the constraint violations are properly stored in the DB
      const translatedConstraintName = sanitizeConstraintName(constraintName);
      const matchingConstraint = $constraints.find(constraint => constraint.name === translatedConstraintName);

      if (matchingConstraint) {
        map[matchingConstraint.id] = violations.map(({ associations, gaps, windows }) => ({
          associations,
          constraintId: matchingConstraint.id,
          constraintName: translatedConstraintName,
          gaps,
          windows: windows.map(({ end, start }) => ({
            end: $planStartTimeMs + end / 1000,
            start: $planStartTimeMs + start / 1000,
          })),
        }));
      }

      return map;
    }, {}),
);

export const constraintViolations: Readable<ConstraintViolation[]> = derived(
  [constraintViolationsMap],
  ([$constraintViolationsMap]) => Object.values($constraintViolationsMap).flat(),
);

export const visibleConstraintViolations: Readable<ConstraintViolation[]> = derived(
  [constraintViolations, constraintVisibilityMap],
  ([$constraintViolations, $constraintVisibilityMap]) =>
    $constraintViolations.filter(violation => $constraintVisibilityMap[violation.constraintId]),
);

/* Helper Functions. */

export function setConstraintVisibility(constraintId: Constraint['id'], visible: boolean) {
  constraintVisibilityMapWritable.set({ ...get(constraintVisibilityMapWritable), [constraintId]: visible });
}

export function setAllConstraintsVisible(visible: boolean) {
  constraintVisibilityMapWritable.set(
    Object.values(get(constraintsMap)).reduce((map, constraint) => {
      map[constraint.id] = visible;
      return map;
    }, {}),
  );
}

export function resetConstraintStores(): void {
  checkConstraintsStatus.set(null);
  constraintViolationsResponseMap.set({});
}
