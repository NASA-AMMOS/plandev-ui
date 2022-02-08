import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import Toastify from 'toastify-js';
import {
  reqCreateConstraint,
  reqDeleteConstraint,
  reqUpdateConstraint,
} from '../utilities/requests';

/* Stores. */

export const modelConstraints: Writable<Constraint[]> = writable([]);
export const planConstraints: Writable<Constraint[]> = writable([]);
export const selectedConstraint: Writable<Constraint | null> = writable(null);
export const violations: Writable<ConstraintViolation[]> = writable([]);

/* Utility Functions. */

export async function createConstraint(
  constraint: CreateConstraint,
): Promise<void> {
  const newConstraint = await reqCreateConstraint(constraint);

  if (newConstraint) {
    if (newConstraint.modelId) {
      modelConstraints.update(constraints => {
        constraints = [...constraints, newConstraint];
        return constraints;
      });
    } else if (newConstraint.planId) {
      planConstraints.update(constraints => {
        constraints = [...constraints, newConstraint];
        return constraints;
      });
    }
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Constraint Created Successfully',
    }).showToast();
  } else {
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Constraint Creation Failed',
    }).showToast();
  }
}

export async function deleteConstraint(id: number): Promise<void> {
  const success = await reqDeleteConstraint(id);

  if (success) {
    modelConstraints.update(constraints => {
      return constraints.filter(constraint => constraint.id !== id);
    });

    planConstraints.update(constraints => {
      return constraints.filter(constraint => constraint.id !== id);
    });

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

export async function updateConstraint(constraint: Constraint): Promise<void> {
  const updatedConstraint = await reqUpdateConstraint(constraint);

  if (updatedConstraint) {
    if (updatedConstraint.modelId) {
      modelConstraints.update(constraints => {
        constraints = constraints.map(constraint => {
          if (constraint.id === updatedConstraint.id) {
            return { ...updatedConstraint };
          }
          return constraint;
        });
        return constraints;
      });
    } else if (updatedConstraint.planId) {
      planConstraints.update(constraints => {
        constraints = constraints.map(constraint => {
          if (constraint.id === updatedConstraint.id) {
            return { ...updatedConstraint };
          }
          return constraint;
        });
        return constraints;
      });
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
