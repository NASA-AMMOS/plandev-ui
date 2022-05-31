import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

/* Stores. */

export const constraintsTsExtraLibs: Writable<TypeScriptExtraLib[]> = writable([]);
export const modelConstraints: Writable<Constraint[]> = writable([]);
export const planConstraints: Writable<Constraint[]> = writable([]);
export const selectedConstraint: Writable<Constraint | null> = writable(null);
export const violations: Writable<ConstraintViolation[]> = writable([]);

/* Helper Functions. */

export function resetConstraintStores(): void {
  constraintsTsExtraLibs.set([]);
  modelConstraints.set([]);
  planConstraints.set([]);
  selectedConstraint.set(null);
  violations.set([]);
}
