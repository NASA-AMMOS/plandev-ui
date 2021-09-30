import type { Readable, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type {
  Constraint,
  ConstraintViolation,
  StringTMap,
} from '../../../types';
import {
  reqDeleteConstraint,
  reqUpdateConstraint,
} from '../../../utilities/requests';

/* Stores. */

type ConstraintsMap = StringTMap<Constraint>;

export const modelConstraintsMap: Writable<ConstraintsMap> = writable({});
export const modelConstraints = derived(
  modelConstraintsMap,
  $modelConstraintsMap => Object.values($modelConstraintsMap),
) as Readable<Constraint[]>;

export const planConstraintsMap: Writable<ConstraintsMap> = writable({});
export const planConstraints = derived(
  planConstraintsMap,
  $planConstraintsMap => Object.values($planConstraintsMap),
) as Readable<Constraint[]>;

export const selectedConstraint: Writable<Constraint | null> = writable(null);
export const selectedConstraintType: Writable<string | null> = writable(null);

export const violations: Writable<ConstraintViolation[]> = writable([]);

/* Utility Functions. */

export async function deleteConstraint(
  constraint: Constraint,
  type: string,
  modelId: string,
  planId: string,
  authorization: string,
): Promise<void> {
  const { success } = await reqDeleteConstraint(
    constraint,
    type,
    modelId,
    planId,
    authorization,
  );
  if (success) {
    if (type === 'model') {
      modelConstraintsMap.update(constraintsMap => {
        delete constraintsMap[constraint.name];
        return constraintsMap;
      });
    } else if (type === 'plan') {
      planConstraintsMap.update(constraintsMap => {
        delete constraintsMap[constraint.name];
        return constraintsMap;
      });
    }
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Constraint Deleted Successfully',
    }).showToast();
  } else {
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Constraint Delete Failed',
    }).showToast();
  }
}

export function setSelectedConstraint(
  constraint: Constraint | null,
  type: string | null = null,
): void {
  selectedConstraint.set(constraint);
  selectedConstraintType.set(type);
}

export async function updateConstraint(
  constraint: Constraint,
  type: string,
  modelId: string,
  planId: string,
  authorization: string,
): Promise<void> {
  const { success } = await reqUpdateConstraint(
    constraint,
    type,
    modelId,
    planId,
    authorization,
  );
  if (success) {
    if (type === 'model') {
      modelConstraintsMap.update(constraintsMap => ({
        ...constraintsMap,
        [constraint.name]: {
          ...constraintsMap[constraint.name],
          ...constraint,
        },
      }));
    } else if (type === 'plan') {
      planConstraintsMap.update(constraintsMap => ({
        ...constraintsMap,
        [constraint.name]: {
          ...constraintsMap[constraint.name],
          ...constraint,
        },
      }));
    }
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Constraint Updated Successfully',
    }).showToast();
  } else {
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Constraint Update Failed',
    }).showToast();
  }
}
