import { writable, type Writable } from 'svelte/store';

/* Stores. */

export const constraintsTsFiles: Writable<TypeScriptFile[]> = writable([]);
export const modelConstraints: Writable<Constraint[]> = writable([]);
export const planConstraints: Writable<Constraint[]> = writable([]);
export const selectedConstraint: Writable<Constraint | null> = writable(null);
export const violations: Writable<ConstraintViolation[]> = writable([]);

/* Helper Functions. */

export function resetConstraintStores(): void {
  constraintsTsFiles.set([]);
  modelConstraints.set([]);
  planConstraints.set([]);
  selectedConstraint.set(null);
  violations.set([]);
}
