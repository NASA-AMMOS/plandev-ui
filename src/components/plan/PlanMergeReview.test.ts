import { cleanup, render } from '@testing-library/svelte';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { activityMetadataDefinitions } from '../../stores/activities';
import { activityTypes } from '../../stores/plan';
import type {
  Plan,
  PlanMergeConflictingActivity,
  PlanMergeNonConflictingActivity,
  PlanMergeRequestSchema,
} from '../../types/plan';
import PlanMergeReview from './PlanMergeReview.svelte';

const mockMergeRequest: PlanMergeRequestSchema = {
  id: 1,
  plan_receiving_changes: {
    id: 1,
    name: 'Demo Plan',
  },
  plan_snapshot_supplying_changes: {
    duration: '168:00:00',
    name: 'Branch 1',
    plan_id: 2,
    snapshot_id: 2,
    start_time: '2023-02-16T00:00:00',
  },
  requester_username: 'unknown',
  reviewer_username: 'unknown',
  status: 'in-progress',
};

const mockInitialPlan: Plan = {
  child_plans: [{ id: 2, name: 'Branch 1' }],
  duration: '168:00:00',
  end_time_doy: '2023-054T00:00:00',
  id: 1,
  is_locked: true,
  model: {
    id: 1,
    jar_id: 1,
    mission: '',
    name: 'Demo Model',
    parameters: {
      parameters: {},
    },
    version: '1.0.0',
  },
  model_id: 1,
  name: 'Demo Plan',
  parent_plan: null,
  revision: 3,
  scheduling_specifications: [{ id: 1 }],
  simulations: [{ simulation_datasets: [{ id: 1 }] }],
  start_time: '2023-02-16T00:00:00',
  start_time_doy: '2023-047T00:00:00',
};

describe('PlanMergeReview component', () => {
  beforeAll(() => {
    activityMetadataDefinitions.updateValue(() => []);
    activityTypes.updateValue(() => []);
  });

  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    activityMetadataDefinitions.updateValue(() => []);
    activityTypes.updateValue(() => []);
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
    const initialConflictingActivities: PlanMergeConflictingActivity[] = [
      {
        activity_id: 1,
        change_type_source: 'delete',
        change_type_target: 'modify',
        merge_base: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          id: 1,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:26',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 1,
          source_scheduling_goal_id: null,
          start_offset: '23:06:17.622',
          tags: [],
          type: 'A_Activity',
        },
        resolution: 'none',
        source: null,
        target: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          id: 1,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:47',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 1,
          source_scheduling_goal_id: null,
          start_offset: '36:25:10.489',
          tags: [],
          type: 'A_Activity',
        },
      },
    ];
    const initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [];

    const { component } = render(PlanMergeReview, {
      initialConflictingActivities,
      initialMergeRequest: { ...mockMergeRequest },
      initialNonConflictingActivities,
      initialPlan: { ...mockInitialPlan },
    });

    expect(component).toBeTruthy();
  });

  it('PlanMergeReview component should not throw with conflicting activities when source is modify and target is delete', () => {
    const initialConflictingActivities: PlanMergeConflictingActivity[] = [
      {
        activity_id: 1,
        change_type_source: 'modify',
        change_type_target: 'delete',
        merge_base: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          id: 1,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:26',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 1,
          source_scheduling_goal_id: null,
          start_offset: '23:06:17.622',
          tags: [],
          type: 'A_Activity',
        },
        resolution: 'none',
        source: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T17:48:26',
          id: 2,
          last_modified_arguments_at: '2023-02-16T17:48:26',
          last_modified_at: '2023-02-16T17:48:47',
          metadata: {},
          name: 'A_Activity',
          snapshot_id: 2,
          source_scheduling_goal_id: null,
          start_offset: '36:25:10.489',
          tags: [],
          type: 'A_Activity',
        },
        target: null,
      },
    ];
    const initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [];

    const { component } = render(PlanMergeReview, {
      initialConflictingActivities,
      initialMergeRequest: { ...mockMergeRequest },
      initialNonConflictingActivities,
      initialPlan: { ...mockInitialPlan },
    });

    expect(component).toBeTruthy();
  });

  it('PlanMergeReview component should not throw with non-conflicting activities', () => {
    const initialConflictingActivities: PlanMergeConflictingActivity[] = [];
    const initialNonConflictingActivities: PlanMergeNonConflictingActivity[] = [
      {
        activity_id: 6,
        change_type: 'add',
        source: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T20:41:07',
          id: 6,
          last_modified_arguments_at: '2023-02-16T20:41:07',
          last_modified_at: '2023-02-16T20:41:07',
          metadata: {},
          name: 'B_Activity',
          snapshot_id: 6,
          source_scheduling_goal_id: null,
          start_offset: '46:33:39.909',
          tags: [],
          type: 'B_Activity',
        },
        target: null,
      },
      {
        activity_id: 7,
        change_type: 'delete',
        source: null,
        target: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T20:41:09',
          id: 7,
          last_modified_arguments_at: '2023-02-16T20:41:09',
          last_modified_at: '2023-02-16T20:41:09',
          metadata: {},
          name: 'C_Activity',
          plan_id: 1,
          snapshot_id: 6,
          source_scheduling_goal_id: null,
          start_offset: '53:35:33.936',
          tags: [],
          type: 'C_Activity',
        },
      },
      {
        activity_id: 5,
        change_type: 'none',
        source: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T20:40:57',
          id: 5,
          last_modified_arguments_at: '2023-02-16T20:40:57',
          last_modified_at: '2023-02-16T20:40:57',
          metadata: {},
          name: 'A_Activity',
          snapshot_id: 6,
          source_scheduling_goal_id: null,
          start_offset: '23:22:32.036',
          tags: [],
          type: 'A_Activity',
        },
        target: {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2023-02-16T20:40:57',
          id: 5,
          last_modified_arguments_at: '2023-02-16T20:40:57',
          last_modified_at: '2023-02-16T20:40:57',
          metadata: {},
          name: 'A_Activity',
          plan_id: 1,
          snapshot_id: 6,
          source_scheduling_goal_id: null,
          start_offset: '23:22:32.036',
          tags: [],
          type: 'A_Activity',
        },
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
