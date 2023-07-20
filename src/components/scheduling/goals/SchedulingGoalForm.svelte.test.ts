import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelSlim } from '../../../types/model';
import type { PlanSchedulingSpec } from '../../../types/plan';
import { ADMIN_ROLE } from '../../../utilities/permissions';
import SchedulingGoalForm from './SchedulingGoalForm.svelte';

vi.mock('$env/dynamic/public', () => import.meta***REMOVED***); // https://github.com/sveltejs/kit/issues/8180

const plans: PlanSchedulingSpec[] = [
  {
    collaborators: [],
    id: 1,
    model_id: 1,
    name: 'Plan With Scheduling Spec',
    owner: 'foo',
    scheduling_specifications: [
      {
        id: 1,
      },
    ],
  },
  {
    collaborators: [],
    id: 2,
    model_id: 1,
    name: 'Plan Without Scheduling Spec',
    owner: 'foo',
    scheduling_specifications: [],
  },
];

const models: ModelSlim[] = [
  {
    created_at: '2023-02-16T00:00:00',
    id: 1,
    jar_id: 1,
    name: 'BananaNation',
    owner: 'bananafarmer',
    plans: [],
    version: '1.0.0',
  },
];

describe('Scheduling Goal Form component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should not assume all plans have a scheduling spec', () => {
    const { container } = render(SchedulingGoalForm, {
      initialGoalModelId: models[0].id,
      models,
      plans,
      user: {
        activeRole: ADMIN_ROLE,
        allowedRoles: [ADMIN_ROLE],
        defaultRole: ADMIN_ROLE,
        id: 'foo',
        permissibleQueries: {},
        token: '',
      },
    });

    const planDropdown: HTMLSelectElement | null = container.querySelector('.st-select[name="plan"]');

    // Ensure the page and dropdown were rendered;
    expect(planDropdown).to.exist;

    // Ensure each plan is listed (plus one for empty option)
    expect(planDropdown?.options.length).toEqual(plans.length + 1);
  });
});
