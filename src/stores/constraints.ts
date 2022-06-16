import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../utilities/status';
import { planStartTimeMs } from './plan';

/* Writeable. */

export const checkConstraintsStatus: Writable<Status> = writable(Status.Clean);

export const constraintViolationsMap: Writable<ConstraintViolationsMap> = writable({});

export const constraintsTsFiles: Writable<TypeScriptFile[]> = writable([]);

export const modelConstraints: Writable<Constraint[]> = writable([]);

export const planConstraints: Writable<Constraint[]> = writable([]);

export const selectedConstraint: Writable<Constraint | null> = writable(null);

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
  checkConstraintsStatus.set(Status.Clean);
  constraintViolationsMap.set({});
  constraintsTsFiles.set([]);
  modelConstraints.set([]);
  planConstraints.set([]);
  selectedConstraint.set(null);
}
