import { keyBy, reverse } from 'lodash-es';
import { describe, expect, test } from 'vitest';
import type { ActivityDirective, ActivityDirectiveDB } from '../types/activity';
import type { Plan } from '../types/plan';
import type { Span, SpanUtilityMaps, SpansMap } from '../types/simulation';
import {
  addAbsoluteTimeToRevision,
  computeActivityDirectivesMap,
  createSpanUtilityMaps,
  getActivityMetadata,
  getAllSpanChildrenIds,
  getAllSpansForActivityDirective,
  getSpanRootParent,
  packActivityDirectivesInPlan,
  sortActivityDirectivesOrSpans,
  updateAnchorStartOffset,
} from './activities';
import { getUnixEpochTime } from './time';

const testSpans: Span[] = [
  {
    attributes: {
      arguments: {},
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '03:00:00',
    durationMs: 10800000,
    endMs: 1,
    parent_id: 1,
    span_id: 2,
    startMs: 0,
    start_offset: '00:10:00',
    type: 'Child',
  },
  {
    attributes: {
      arguments: {},
      computedAttributes: {},
      directiveId: 2,
    },
    dataset_id: 1,
    duration: '02:00:00',
    durationMs: 7200000,
    endMs: 1,
    parent_id: null,
    span_id: 1,
    startMs: 0,
    start_offset: '00:00:00',
    type: 'Parent',
  },
  {
    attributes: {
      arguments: {},
      computedAttributes: {},
    },
    dataset_id: 1,
    duration: '04:00:00',
    durationMs: 14400000,
    endMs: 1,
    parent_id: 1,
    span_id: 3,
    startMs: 0,
    start_offset: '00:05:00',
    type: 'Child',
  },
  {
    attributes: {
      arguments: {},
      computedAttributes: {},
      directiveId: 0,
    },
    dataset_id: 1,
    duration: '04:00:00',
    durationMs: 14400000,
    endMs: 1,
    parent_id: null,
    span_id: 4,
    startMs: 0,
    start_offset: '00:05:00',
    type: 'BiteBanana',
  },
  {
    attributes: {
      arguments: {},
      computedAttributes: {},
      directiveId: 1,
    },
    dataset_id: 1,
    duration: '04:00:00',
    durationMs: 14400000,
    endMs: 1,
    parent_id: null,
    span_id: 5,
    startMs: 0,
    start_offset: '00:05:00',
    type: 'BiteBanana',
  },
];

const testSpansMap: SpansMap = keyBy(testSpans, 'span_id');
const testSpansUtilityMap: SpanUtilityMaps = createSpanUtilityMaps(testSpans);

describe('getActivityMetadata', () => {
  test('Should update activity metadata correctly', () => {
    expect(getActivityMetadata({ foo: null, z: null }, 'foo', 'bar')).toEqual({ foo: 'bar' });
  });
});

describe('getSpanRootParent', () => {
  test('Should return null for a null span id', () => {
    expect(getSpanRootParent(testSpansMap, null)).toEqual(null);
  });

  test('Should return null for an ID that does not exist', () => {
    expect(getSpanRootParent(testSpansMap, 42)).toEqual(null);
  });

  test('Should return the parent node when given a child n', () => {
    expect(getSpanRootParent(testSpansMap, 2)?.span_id).toEqual(1);
  });
});

describe('sortActivityDirectivesOrSpans', () => {
  const activityDirectives: ActivityDirective[] = [
    {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      created_by: 'admin',
      id: 1,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      last_modified_by: 'admin',
      metadata: {},
      name: 'foo 1',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '10:00:00',
      start_time_ms: 1715731443696,
      tags: [],
      type: 'foo',
    },
    {
      anchor_id: null,
      anchored_to_start: false,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      created_by: 'admin',
      id: 2,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      last_modified_by: 'admin',
      metadata: {},
      name: 'foo 2',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '09:00:00',
      start_time_ms: 1715731443696,
      tags: [],
      type: 'foo',
    },
    {
      anchor_id: null,
      anchored_to_start: false,
      applied_preset: null,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      created_by: 'admin',
      id: 3,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      last_modified_by: 'admin',
      metadata: {},
      name: 'foo 3',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '08:00:00',
      start_time_ms: 1715731443696,
      tags: [],
      type: 'foo',
    },
  ];

  const spans: Span[] = [
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 2,
      },
      dataset_id: 1,
      duration: '02:00:00',
      durationMs: 14400000,
      endMs: 1,
      parent_id: null,
      span_id: 0,
      startMs: 0,
      start_offset: '10:00:00',
      type: 'Parent',
    },
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 2,
      },
      dataset_id: 1,
      duration: '02:00:00',
      durationMs: 14400000,
      endMs: 1,
      parent_id: null,
      span_id: 2,
      startMs: 0,
      start_offset: '09:00:00',
      type: 'Parent',
    },
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 2,
      },
      dataset_id: 1,
      duration: '02:00:00',
      durationMs: 14400000,
      endMs: 1,
      parent_id: null,
      span_id: 1,
      startMs: 0,
      start_offset: '09:00:00',
      type: 'Parent',
    },
  ];

  test('Should properly sort directives in time ascending order', () => {
    expect(activityDirectives.slice().sort(sortActivityDirectivesOrSpans)).toEqual(reverse(activityDirectives));
  });

  test('Should properly sort spans in time ascending order', () => {
    expect(spans.slice().sort(sortActivityDirectivesOrSpans)).toEqual(reverse(spans));
  });
});

describe('createSpanUtilityMaps', () => {
  test('Should create span utility maps for span array', () => {
    const expectedResult: SpanUtilityMaps = {
      directiveIdToSpanIdMap: { 0: 4, 1: 5, 2: 1 },
      spanIdToChildIdsMap: { 1: [2, 3], 2: [], 3: [], 4: [], 5: [] },
      spanIdToDirectiveIdMap: { 1: 2, 4: 0, 5: 1 },
    };

    expect(testSpansUtilityMap).to.deep.equal(expectedResult);
  });
});

describe('getAllSpansForActivityDirective', () => {
  test('Should get all spans for an activity directive', () => {
    const resultingSpanIds = testSpans
      .slice(0, 3)
      .map(s => s.span_id)
      .sort();
    expect(
      getAllSpansForActivityDirective(2, testSpansMap, testSpansUtilityMap)
        .map(s => s.span_id)
        .sort(),
    ).to.deep.equal(resultingSpanIds);
  });
  test('Should return empty array when primary span does not exist for an activity directive', () => {
    expect(getAllSpansForActivityDirective(99, testSpansMap, testSpansUtilityMap)).to.be.empty;
  });
});

describe('getAllSpanChildrenIds', () => {
  test('Should get all of the child IDs for a span', () => {
    expect(getAllSpanChildrenIds(1, testSpansUtilityMap)).to.deep.equal([2, 3]);
    expect(getAllSpanChildrenIds(2, testSpansUtilityMap)).to.deep.equal([]);
    expect(getAllSpanChildrenIds(4, testSpansUtilityMap)).to.deep.equal([]);
  });
});

function getTestPlan(): Plan {
  return {
    child_plans: [],
    collaborators: [],
    constraint_specification: [],
    created_at: '2006-07-11T00:00:00',
    duration: '1y',
    end_time_doy: '2006-T194:00:00',
    id: 1,
    is_locked: false,
    model: {
      constraint_specification: [],
      created_at: '2006-07-11T00:00:00',
      default_view_id: 0,
      id: 1,
      jar_id: 123,
      mission: 'Test',
      name: 'Test Model',
      owner: 'test',
      parameters: { parameters: {} },
      plans: [],
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
    name: 'Foo plan',
    owner: 'test',
    parent_plan: null,
    revision: 1,
    scheduling_specification: null,
    simulations: [
      {
        id: 3,
        simulation_datasets: [
          {
            id: 1,
            plan_revision: 1,
          },
        ],
      },
    ],
    start_time: '2006-07-11T00:00:00+00:00',
    start_time_doy: '2006-192T00:00:00',
    tags: [
      {
        tag: {
          color: '#fff',
          created_at: '2024-01-01T00:00:00',
          id: 0,
          name: 'test tag',
          owner: 'test',
        },
      },
    ],
    updated_at: '2030-01-01T00:00:00',
    updated_by: 'test',
  };
}

function getTestActivityDirectivesDB(): ActivityDirectiveDB[] {
  return [
    {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2006-07-11T00:00:00',
      created_by: 'admin',
      id: 1,
      last_modified_arguments_at: '2006-07-11T00:00:00',
      last_modified_at: '2006-07-11T00:00:00',
      last_modified_by: 'admin',
      metadata: {},
      name: 'Activity 1',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '10:00:00',
      tags: [],
      type: 'foo',
    },
    {
      anchor_id: 1,
      anchored_to_start: false,
      applied_preset: null,
      arguments: {},
      created_at: '2006-07-11T00:00:00',
      created_by: 'admin',
      id: 2,
      last_modified_arguments_at: '2006-07-11T00:00:00',
      last_modified_at: '2006-07-11T00:00:00',
      last_modified_by: 'admin',
      metadata: {},
      name: 'Activity 2',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '09:00:00',
      tags: [],
      type: 'foo',
    },
    {
      anchor_id: null,
      anchored_to_start: false,
      applied_preset: null,
      arguments: {},
      created_at: '2006-07-11T00:00:00',
      created_by: 'admin',
      id: 3,
      last_modified_arguments_at: '2006-07-11T00:00:00',
      last_modified_at: '2006-07-11T00:00:00',
      last_modified_by: 'admin',
      metadata: {},
      name: 'Activity 3',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '08:00:00',
      tags: [],
      type: 'foo',
    },
  ];
}

describe('addAbsoluteTimeToRevision', () => {
  const activityDirectiveDB = {
    anchor_id: null,
    anchored_to_start: true,
    applied_preset: null,
    arguments: {},
    created_at: '2006-07-11T00:00:00',
    created_by: 'admin',
    id: 1,
    last_modified_arguments_at: '2006-07-11T00:00:00',
    last_modified_at: '2006-07-11T00:00:00',
    last_modified_by: 'admin',
    metadata: {},
    name: 'foo 1',
    plan_id: 1,
    source_scheduling_goal_id: null,
    start_offset: '05:00:00',
    tags: [],
    type: 'foo',
  };

  const activityDirectiveRevision = {
    anchor_id: null,
    anchored_to_start: true,
    arguments: {},
    changed_at: '2006-07-11T21:53:22',
    changed_by: 'admin',
    metadata: {},
    name: 'foo 1',
    revision: 1,
    start_offset: '10:00:00',
    start_time_ms: null,
  };

  const activitiesDirectivesDB = [activityDirectiveDB];
  const spansMap = {};
  const spanUtilityMaps = createSpanUtilityMaps([]);

  test('should compute and set start_time_ms on revision', () => {
    const newRevision = addAbsoluteTimeToRevision(
      activityDirectiveRevision,
      1,
      getTestPlan(),
      activitiesDirectivesDB,
      spansMap,
      spanUtilityMaps,
    );
    expect(newRevision.start_time_ms).toEqual(new Date('2006-07-11T10:00:00+00:00').getTime());
  });
});

const arrayOfStartTimeMs = [1152612000000, 1152644400000, 1152604800000];

const activityDirectives: ActivityDirective[] = getTestActivityDirectivesDB().map((directive, i) => ({
  ...directive,
  start_time_ms: arrayOfStartTimeMs[i],
}));

describe('updateAnchorStartOffset', () => {
  const spans = [
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 1,
      },
      dataset_id: 1,
      duration: '03:00:00',
      durationMs: 10800000,
      endMs: 1,
      parent_id: null,
      span_id: 0,
      startMs: 0,
      start_offset: '00:00:00',
      type: 'foo',
    },
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 2,
      },
      dataset_id: 1,
      duration: '05:00:00',
      durationMs: 18000000,
      endMs: 1,
      parent_id: null,
      span_id: 1,
      startMs: 0,
      start_offset: '00:00:00',
      type: 'foo',
    },
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 3,
      },
      dataset_id: 1,
      duration: '01:00:00',
      durationMs: 3600000,
      endMs: 1,
      parent_id: null,
      span_id: 2,
      startMs: 0,
      start_offset: '08:00:00',
      type: 'foo',
    },
  ];

  const spanIdToDirectiveIdMap: Record<number, number> = { 0: 1, 1: 2, 2: 3 };
  const directiveIdToSpanIdMap: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
  const spanIdToChildIdsMap: Record<number, number[]> = { 0: [], 1: [], 2: [] };
  const spanUtilityMaps = {
    directiveIdToSpanIdMap,
    spanIdToChildIdsMap,
    spanIdToDirectiveIdMap,
  };

  const activityDirectivesMap = computeActivityDirectivesMap(
    getTestActivityDirectivesDB(),
    getTestPlan(),
    spans,
    spanUtilityMaps,
  );

  const planStartTimeMs = getUnixEpochTime(getTestPlan().start_time_doy);
  console.log('Plan start time', planStartTimeMs);

  test('Update start offset', () => {
    const newStartTimes = new Map();

    newStartTimes.set(2, 43_200_000_000); //12 hours from the plan
    let startOffset = updateAnchorStartOffset(1, 2, planStartTimeMs, activityDirectivesMap, newStartTimes);
    expect(startOffset).toBe('02:00:00.000000');

    newStartTimes.set(1, 43_200_000_000);
    startOffset = updateAnchorStartOffset(1, 2, planStartTimeMs, activityDirectivesMap, newStartTimes);
    expect(startOffset).toBe('00:00:00.000000');
  });
});

describe('packActivityDirectivesInPlan', () => {
  const spans = [
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 1,
      },
      dataset_id: 1,
      duration: '03:00:00',
      durationMs: 10800000,
      endMs: 1,
      parent_id: null,
      span_id: 0,
      startMs: 0,
      start_offset: '00:00:00',
      type: 'foo',
    },
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 2,
      },
      dataset_id: 1,
      duration: '05:00:00',
      durationMs: 18000000,
      endMs: 1,
      parent_id: null,
      span_id: 1,
      startMs: 0,
      start_offset: '00:00:00',
      type: 'foo',
    },
    {
      attributes: {
        arguments: {},
        computedAttributes: {},
        directiveId: 3,
      },
      dataset_id: 1,
      duration: '01:00:00',
      durationMs: 3600000,
      endMs: 1,
      parent_id: null,
      span_id: 2,
      startMs: 0,
      start_offset: '08:00:00',
      type: 'foo',
    },
  ];

  const spanIdToDirectiveIdMap: Record<number, number> = { 0: 1, 1: 2, 2: 3 };
  const directiveIdToSpanIdMap: Record<number, number> = { 1: 0, 2: 1, 3: 2 };
  const spanIdToChildIdsMap: Record<number, number[]> = { 0: [], 1: [], 2: [] };
  const spanUtilityMaps = {
    directiveIdToSpanIdMap,
    spanIdToChildIdsMap,
    spanIdToDirectiveIdMap,
  };

  test('pack all the activities to the left', () => {
    const leftPacked = packActivityDirectivesInPlan(
      getTestPlan(),
      activityDirectives,
      'LEFT',
      0,
      getTestActivityDirectivesDB(),
      spans,
      spanUtilityMaps,
    );

    expect(leftPacked).toBeDefined();
    if (leftPacked) {
      expect(leftPacked[0].id).toEqual(3);
      expect(leftPacked[1].id).toEqual(1);
      expect(leftPacked[2].id).toEqual(2);
      expect(leftPacked[0].start_offset).toEqual('08:00:00.000000');
      expect(leftPacked[1].start_offset).toEqual('09:00:00.000000');
      expect(leftPacked[2].start_offset).toEqual('03:00:00.000000'); // anchored to previous activity
    }
  });

  test('pack all the activities to the left with offset', () => {
    const leftPacked = packActivityDirectivesInPlan(
      getTestPlan(),
      activityDirectives,
      'LEFT',
      3600000000, // 1 hour
      getTestActivityDirectivesDB(),
      spans,
      spanUtilityMaps,
    );

    expect(leftPacked).toBeDefined();
    if (leftPacked) {
      expect(leftPacked[0].id).toEqual(3);
      expect(leftPacked[1].id).toEqual(1);
      expect(leftPacked[2].id).toEqual(2);
      expect(leftPacked[0].start_offset).toEqual('08:00:00.000000');
      expect(leftPacked[1].start_offset).toEqual('10:00:00.000000');
      expect(leftPacked[2].start_offset).toEqual('04:00:00.000000'); // anchored to previous activity
    }
  });

  test('pack all the activities to the right', () => {
    const rightPacked = packActivityDirectivesInPlan(
      getTestPlan(),
      activityDirectives,
      'RIGHT',
      0,
      getTestActivityDirectivesDB(),
      spans,
      spanUtilityMaps,
    );

    expect(rightPacked).toBeDefined();
    if (rightPacked) {
      expect(rightPacked[0].id).toBe(2);
      expect(rightPacked[1].id).toEqual(1);
      expect(rightPacked[2].id).toEqual(3);
      expect(rightPacked[0].start_offset).toEqual('03:00:00.000000'); //anchored to activity below
      expect(rightPacked[1].start_offset).toEqual('16:00:00.000000');
      expect(rightPacked[2].start_offset).toEqual('15:00:00.000000');
    }
  });
});
