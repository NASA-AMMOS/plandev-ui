import { derived, writable, type Readable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import type { Status } from '../utilities/status';
import { planStartTimeMs } from './plan';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const constraints = gqlSubscribable<Constraint[]>(gql.SUB_CONSTRAINTS, { modelId: -1, planId: -1 }, []);

export const constraintsAll = gqlSubscribable<Constraint[]>(gql.SUB_CONSTRAINTS_ALL, {}, []);

/* Writeable. */

export const checkConstraintsStatus: Writable<Status | null> = writable(null);

export const constraintViolationsMap: Writable<ConstraintViolationsMap> = writable({});

export const constraintsColumns: Writable<string> = writable('1fr 1px 2fr');

/* Derived. */

export const constraintViolations: Readable<ConstraintViolation[]> = derived(
  [constraintViolationsMap, planStartTimeMs],
  ([$constraintViolationsMap, $planStartTimeMs]) =>
    Object.entries($constraintViolationsMap).flatMap(([constraintName, violations]) =>
      violations.map(({ associations, windows }) => ({
        associations,
        constraintName,
        windows: windows.map(({ end, start }) => ({
          end: $planStartTimeMs + end / 1000,
          start: $planStartTimeMs + start / 1000,
        })),
      })),
    ),
);

/* Helper Functions. */

export function resetConstraintStores(): void {
  checkConstraintsStatus.set(null);
  constraintViolationsMap.set({});
}
