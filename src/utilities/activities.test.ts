import { describe, expect, test } from 'vitest';
import type { Activity, ActivityDirective } from '../types/activity';
import type { Plan } from '../types/plan';
import {
  createActivitiesMap,
  decomposeActivityDirectiveId,
  getActivityDirectiveUniqueId,
  isDirective,
  isSpan,
} from './activities';
import { getDoyTime } from './time';

describe('getActivityDirectiveUniqueId', () => {
  test('Should create a valid activity directive ID', () => {
    expect(getActivityDirectiveUniqueId(0, 20)).toEqual('directive_0_20');
    expect(getActivityDirectiveUniqueId(33, 5)).toEqual('directive_33_5');
  });

  test('Should throw an error for invalid parameters', () => {
    expect(() => getActivityDirectiveUniqueId(null, 20)).toThrow('Empty plan ID provided');
    expect(() => getActivityDirectiveUniqueId(30, null)).toThrow('Empty activity ID provided');
  });
});

describe('decomposeActivityDirectiveId', () => {
  test('Should correctly deconstruct the activity directive ID into plan and activity IDs', () => {
    expect(decomposeActivityDirectiveId('directive_0_2234')).toEqual({
      activityId: 2234,
      planId: 0,
    });

    expect(decomposeActivityDirectiveId('directive_3232_553')).toEqual({
      activityId: 553,
      planId: 3232,
    });
  });

  test('Should throw an error for incorrectly formatted activity directive IDs', () => {
    expect(() => decomposeActivityDirectiveId('active_3232_553')).toThrow(
      'Invalid Activity Directive ID (active_3232_553) provided',
    );
  });
});

describe('createActivitiesMap', () => {
  const plan: Plan = {
    child_plans: [],
    duration: '2 days',
    end_time_doy: '2023-003T00:00:00',
    id: 12,
    is_locked: false,
    model: {
      id: 9,
      jar_id: 0,
      mission: 'foo',
      name: 'Foo Model',
      parameters: {
        parameters: {},
      },
      version: '1',
    },
    model_id: 9,
    name: 'Foo',
    parent_plan: null,
    revision: 1,
    scheduling_specifications: [],
    simulations: [
      {
        simulation_datasets: [
          {
            id: 1,
          },
        ],
      },
    ],
    start_time: '2023-01-01T00:00:00',
    start_time_doy: '2023-001T00:00:00',
  };

  const activityDirectives: ActivityDirective[] = [
    {
      anchor_id: null,
      anchored_to_start: true,
      arguments: {},
      created_at: '2022-08-03T18:21:51.954599+00:00',
      id: 12,
      last_modified_arguments_at: '2022-08-03T21:53:22.093235+00:00',
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'parent 1',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00.00',
      tags: [],
      type: 'parent',
    },
    {
      anchor_id: 12,
      anchored_to_start: true,
      arguments: {},
      created_at: '2022-08-03T18:21:51.954599+00:00',
      id: 13,
      last_modified_arguments_at: '2022-08-03T21:53:22.093235+00:00',
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'child 1',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '00:10:00.00',
      tags: [],
      type: 'child',
    },
    {
      anchor_id: 12,
      anchored_to_start: true,
      arguments: {},
      created_at: '2022-08-03T18:21:51.954599+00:00',
      id: 14,
      last_modified_arguments_at: '2022-08-03T21:53:22.093235+00:00',
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'child 2',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '11:00:00.00',
      tags: [],
      type: 'child',
    },
    {
      anchor_id: 13,
      anchored_to_start: true,
      arguments: {},
      created_at: '2022-08-03T18:21:51.954599+00:00',
      id: 15,
      last_modified_arguments_at: '2022-08-03T21:53:22.093235+00:00',
      last_modified_at: '2022-08-03T21:53:22.093235+00:00',
      metadata: {},
      name: 'child 3',
      plan_id: 12,
      source_scheduling_goal_id: null,
      start_offset: '09:00:00.00',
      tags: [],
      type: 'child',
    },
  ];

  test('Should determine the correct `start_time_doy` for directives anchored to other directives', () => {
    const testActivitiesMap = createActivitiesMap(plan, activityDirectives, []);

    expect(testActivitiesMap.directive_12_12.start_time_doy).toEqual(getDoyTime(new Date('2023-01-01T00:00:00.000')));
    expect(testActivitiesMap.directive_12_13.start_time_doy).toEqual(getDoyTime(new Date('2023-01-01T00:10:00.000')));
    expect(testActivitiesMap.directive_12_14.start_time_doy).toEqual(getDoyTime(new Date('2023-01-01T11:00:00.000')));
    expect(testActivitiesMap.directive_12_15.start_time_doy).toEqual(getDoyTime(new Date('2023-01-01T09:10:00.000')));
  });
});

describe('isDirective', () => {
  test('Should correctly determine if an activity is a directive', () => {
    expect(isDirective({ parent_id: null } as Activity)).toEqual(true);
    expect(isDirective({ parent_id: 0 } as Activity)).toEqual(false);
  });
});

describe('isSpan', () => {
  test('Should correctly determine if an activity is a span', () => {
    expect(isSpan({ parent_id: 1 } as Activity)).toEqual(true);
    expect(isSpan({ parent_id: null } as Activity)).toEqual(false);
  });
});
