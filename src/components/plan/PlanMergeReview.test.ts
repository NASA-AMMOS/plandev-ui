import { cleanup, render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { activityMetadataDefinitions } from '../../stores/activities';
import { planModelActivityTypes } from '../../stores/plan';
import type { Model } from '../../types/model';
import type {
  Plan,
  PlanMergeConflictingActivityDB,
  PlanMergeNonConflictingActivityDB,
  PlanMergeRequestSchema,
} from '../../types/plan';
import effects from '../../utilities/effects';
import { ADMIN_ROLE } from '../../utilities/permissions';
import PlanMergeReview from './PlanMergeReview.svelte';

vi.mock('svelte', async importOriginal => {
  const actual = await importOriginal<typeof import('svelte')>();
  const actualGetContext = actual.getContext;
  return {
    ...actual,
    getContext: vi.fn((key: string) => {
      if (key === 'user') {
        return writable({
          activeRole: ADMIN_ROLE,
          allowedRoles: [ADMIN_ROLE],
          defaultRole: ADMIN_ROLE,
          id: 'foo',
          permissibleQueries: {},
          rolePermissions: {},
          token: '',
        });
      }
      // Fall through to actual getContext for other keys (e.g., bits-ui internal contexts)
      return actualGetContext(key);
    }),
    // Explicitly define untrack function that might be used by SvelteKit
    untrack: vi.fn(fn => fn()),
  };
});

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180
vi.mock('$app/stores', () => {
  const page = {
    subscribe: vi.fn((callback: (value: { url: URL }) => void) => {
      callback({ url: new URL('http://localhost/plans') });
      return () => {};
    }),
  };
  return { page };
});
vi.spyOn(effects, 'getVersion').mockResolvedValue({
  branch: 'unknown',
  commit: 'unknown',
  commitUrl: '',
  date: new Date().toLocaleString(),
  name: 'plandev-ui',
});

const mockMergeRequest: PlanMergeRequestSchema = {
  id: 1,
  plan_receiving_changes: {
    collaborators: [],
    duration: '168:00:00',
    id: 1,
    model: {
      owner: 'unknown',
    } as Model,
    model_id: 1,
    name: 'Demo Plan',
    owner: 'unknown',
    start_time: '2024-01-01T00:00:00Z',
  },
  plan_snapshot_supplying_changes: {
    plan: {
      collaborators: [],
      duration: '168:00:00',
      id: 2,
      model: {
        owner: 'unknown',
      } as Model,
      model_id: 1,
      name: 'Branch 1',
      owner: 'unknown',
      start_time: '2024-01-01T00:00:00Z',
    },
    snapshot_id: 2,
  },
  requester_username: 'unknown',
  reviewer_username: 'unknown',
  status: 'in-progress',
};

const mockInitialPlan: Plan = {
  child_plans: [{ id: 2, name: 'Branch 1' }],
  collaborators: [{ collaborator: 'tester 2' }],
  constraint_specification: [],
  created_at: '2023-02-16T00:00:00',
  duration: '168:00:00',
  end_time_doy: '2023-054T00:00:00',
  id: 1,
  is_locked: true,
  model: {
    activity_types: [],
    constraint_specification: [],
    created_at: '2023-02-16T00:00:00',
    default_view_id: 0,
    derivation_group_specification: [],
    id: 1,
    jar_id: 1,
    mission: '',
    name: 'Demo Model',
    owner: 'spacecaptain',
    parameters: {
      parameters: {},
    },
    plans: [{ id: 1 }],
    refresh_activity_type_logs: [],
    refresh_model_parameter_logs: [],
    refresh_resource_type_logs: [],
    revision: 1,
    scheduling_specification_conditions: [],
    scheduling_specification_goals: [],
    version: '1.0.0',
    view: null,
  },
  model_id: 1,
  name: 'Demo Plan',
  owner: 'spacecaptain',
  parent_plan: null,
  revision: 3,
  scheduling_specification: { id: 1 },
  simulations: [{ id: 2, simulation_datasets: [{ id: 1, plan_revision: 3 }] }],
  start_time: '2023-02-16T00:00:00',
  start_time_doy: '2023-047T00:00:00',
  tags: [],
  updated_at: '2023-02-16T00:00:00',
  updated_by: 'redshirt',
};

describe('PlanMergeReview component', () => {
  beforeAll(() => {
    activityMetadataDefinitions.updateValue(() => []);
    planModelActivityTypes.updateValue(() => []);
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    activityMetadataDefinitions.updateValue(() => []);
    planModelActivityTypes.updateValue(() => []);
  });

  it('Should render the PlanMergeReview component', () => {
    const { component } = render(PlanMergeReview, {
      initialConflictingActivities: [],
      initialMergeRequest: { ...mockMergeRequest },
      initialNonConflictingActivities: [],
      initialPlan: { ...mockInitialPlan },
    });

    expect(component).toBeTruthy();
  });

  it('PlanMergeReview component should not throw with conflicting activities when source is delete and target is modify', () => {
    const initialConflictingActivities: PlanMergeConflictingActivityDB[] = [
      {
        activity_id: 1,
        change_type_source: 'delete',
        change_type_target: 'modify',
        merge_base: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          created_by: 'admin',
          id: 1,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:26',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 1,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '23:06:17.622',
          tags: [],
          type: 'A_Activity',
        },
        resolution: 'none',
        source: null,
        source_tags: [],
        target: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          created_by: 'admin',
          id: 1,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:47',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 1,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '36:25:10.489',
          tags: [],
          type: 'A_Activity',
        },
        target_tags: [],
      },
    ];
    const initialNonConflictingActivities: PlanMergeNonConflictingActivityDB[] = [];

    const { component } = render(PlanMergeReview, {
      initialConflictingActivities,
      initialMergeRequest: { ...mockMergeRequest },
      initialNonConflictingActivities,
      initialPlan: { ...mockInitialPlan },
    });

    expect(component).toBeTruthy();
  });

  it('PlanMergeReview component should not throw with conflicting activities when source is modify and target is delete', () => {
    const initialConflictingActivities: PlanMergeConflictingActivityDB[] = [
      {
        activity_id: 1,
        change_type_source: 'modify',
        change_type_target: 'delete',
        merge_base: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          created_by: 'admin',
          id: 1,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:26',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 1,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '23:06:17.622',
          tags: [],
          type: 'A_Activity',
        },
        resolution: 'none',
        source: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          created_by: 'admin',
          id: 2,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:47',
          metadata: {},
          name: 'A_Activity',
          snapshot_id: 2,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '36:25:10.489',
          tags: [],
          type: 'A_Activity',
        },
        source_tags: [],
        target: null,
        target_tags: [],
      },
    ];
    const initialNonConflictingActivities: PlanMergeNonConflictingActivityDB[] = [];

    const { component } = render(PlanMergeReview, {
      initialConflictingActivities,
      initialMergeRequest: { ...mockMergeRequest },
      initialNonConflictingActivities,
      initialPlan: { ...mockInitialPlan },
    });

    expect(component).toBeTruthy();
  });

  it('PlanMergeReview component should not throw with non-conflicting activities', () => {
    const initialConflictingActivities: PlanMergeConflictingActivityDB[] = [];
    const initialNonConflictingActivities: PlanMergeNonConflictingActivityDB[] = [
      {
        activity_id: 6,
        change_type: 'add',
        source: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T20:41:07',
          created_by: 'admin',
          id: 6,
          last_modified_arguments_at: '2023-02-16T20:41:07',
          last_modified_at: '2023-02-16T20:41:07',
          metadata: {},
          name: 'B_Activity',
          snapshot_id: 6,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '46:33:39.909',
          tags: [],
          type: 'B_Activity',
        },
        source_tags: [],
        target: null,
        target_tags: [],
      },
      {
        activity_id: 7,
        change_type: 'delete',
        source: null,
        source_tags: [],
        target: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T20:41:09',
          created_by: 'admin',
          id: 7,
          last_modified_arguments_at: '2023-02-16T20:41:09',
          last_modified_at: '2023-02-16T20:41:09',
          metadata: {},
          name: 'C_Activity',
          plan_id: 1,
          snapshot_id: 6,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '53:35:33.936',
          tags: [],
          type: 'C_Activity',
        },
        target_tags: [],
      },
      {
        activity_id: 5,
        change_type: 'none',
        source: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T20:40:57',
          created_by: 'admin',
          id: 5,
          last_modified_arguments_at: '2023-02-16T20:40:57',
          last_modified_at: '2023-02-16T20:40:57',
          metadata: {},
          name: 'A_Activity',
          snapshot_id: 6,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '23:22:32.036',
          tags: [],
          type: 'A_Activity',
        },
        source_tags: [],
        target: {
          anchor_id: null,
          anchored_to_start: true,
          applied_preset: null,
          arguments: {},
          created_at: '2023-02-16T20:40:57',
          created_by: 'admin',
          id: 5,
          last_modified_arguments_at: '2023-02-16T20:40:57',
          last_modified_at: '2023-02-16T20:40:57',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 6,
          source_scheduling_goal_id: -1,
          source_scheduling_goal_invocation_id: -1,
          start_offset: '23:22:32.036',
          tags: [],
          type: 'A_Activity',
        },
        target_tags: [],
      },
    ];

    const { component } = render(PlanMergeReview, {
      initialConflictingActivities,
      initialMergeRequest: { ...mockMergeRequest },
      initialNonConflictingActivities,
      initialPlan: { ...mockInitialPlan },
    });

    expect(component).toBeTruthy();
  });
});
