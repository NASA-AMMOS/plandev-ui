import { keyBy, reverse } from 'lodash-es';
import { describe, expect, test } from 'vitest';
import type { ActivityDirective } from '../types/activity';
import type { Span, SpanUtilityMaps, SpansMap } from '../types/simulation';
import {
  createSpanUtilityMaps,
  getActivityMetadata,
  getAllSpanChildrenIds,
  getAllSpansForActivityDirective,
  getSpanRootParent,
  sortActivityDirectivesOrSpans,
} from './activities';

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
