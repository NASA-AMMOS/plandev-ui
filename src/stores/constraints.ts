import type { Writable } from 'svelte/store';
import { get, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { plan } from '../stores/plan';
import { Status } from '../utilities/enums';
import req from '../utilities/requests';
import { simulationStatus } from './simulation';

/* Stores. */

export const modelConstraints: Writable<Constraint[]> = writable([]);
export const planConstraints: Writable<Constraint[]> = writable([]);
export const selectedConstraint: Writable<Constraint | null> = writable(null);
export const violations: Writable<ConstraintViolation[]> = writable([]);

/* Action Functions. */

export const constraintActions = {
  async createConstraint(
    constraintType: ConstraintType,
    definition: string,
    description: string,
    name: string,
    summary: string,
  ): Promise<void> {
    const { id: planId, model } = get(plan);
    const model_id = constraintType === 'model' ? model.id : null;
    const plan_id = constraintType === 'plan' ? planId : null;
    const constraint: ConstraintInsertInput = {
      definition,
      description,
      model_id,
      name,
      plan_id,
      summary,
    };
    const id = await req.createConstraint(constraint);

    if (id !== null) {
      const newConstraint: Constraint = { ...constraint, id };

      if (constraintType === 'model') {
        modelConstraints.update(constraints => [...constraints, newConstraint]);
      } else if (constraintType === 'plan') {
        planConstraints.update(constraints => [...constraints, newConstraint]);
      }

      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Constraint Created Successfully',
      }).showToast();

      simulationStatus.update(Status.Dirty);
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Constraint Creation Failed',
      }).showToast();
    }
  },

  async deleteConstraint(id: number): Promise<void> {
    const success = await req.deleteConstraint(id);

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

      simulationStatus.update(Status.Dirty);
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Constraint Delete Failed',
      }).showToast();
    }
  },

  reset(): void {
    modelConstraints.set([]);
    planConstraints.set([]);
    selectedConstraint.set(null);
    violations.set([]);
  },

  async updateConstraint(
    constraintType: ConstraintType,
    id: number,
    definition: string,
    description: string,
    name: string,
    summary: string,
  ): Promise<void> {
    const constraint: Partial<Constraint> = {
      definition,
      description,
      name,
      summary,
    };
    const success = await req.updateConstraint(id, constraint);

    if (success) {
      if (constraintType === 'model') {
        modelConstraints.update(constraints => {
          constraints = constraints.map(currentConstraint => {
            if (currentConstraint.id === id) {
              return { ...currentConstraint, ...constraint };
            }
            return currentConstraint;
          });
          return constraints;
        });
      } else if (constraintType === 'plan') {
        planConstraints.update(constraints => {
          constraints = constraints.map(currentConstraint => {
            if (currentConstraint.id === id) {
              return { ...currentConstraint, ...constraint };
            }
            return currentConstraint;
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

      simulationStatus.update(Status.Dirty);
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Constraint Update Failed',
      }).showToast();
    }
  },
};
