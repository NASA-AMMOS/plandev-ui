import { reverse } from 'lodash-es';
import { describe, expect, test } from 'vitest';
import type { ActivityDirective } from '../types/activity';
import type { SpansMap } from '../types/simulation';
import { getActivityMetadata, getSpanRootParent, sortActivityDirectives } from './activities';

describe('getActivityMetadata', () => {
  test('Should update activity metadata correctly', () => {
    expect(getActivityMetadata({ foo: null, z: null }, 'foo', 'bar')).toEqual({ foo: 'bar' });
  });
});

describe('getSpanRootParent', () => {
  const spansMap: SpansMap = {
    1: {
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      dataset_id: 1,
      duration: '02:00:00',
      id: 1,
      parent_id: null,
      start_offset: '00:00:00',
      type: 'Parent',
    },
    2: {
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      dataset_id: 1,
      duration: '03:00:00',
      id: 2,
      parent_id: 1,
      start_offset: '00:10:00',
      type: 'Child',
    },
    3: {
      attributes: {
        arguments: {},
        computedAttributes: {},
      },
      dataset_id: 1,
      duration: '04:00:00',
      id: 3,
      parent_id: 1,
      start_offset: '00:05:00',
      type: 'Child',
    },
  };

  test('Should return null for an ID that does not exist', () => {
    expect(getSpanRootParent(spansMap, 42)).toEqual(null);
  });

  test('Should return the parent node when given a child n', () => {
    expect(getSpanRootParent(spansMap, 2).id).toEqual(1);
  });
});

describe('sortActivityDirectives', () => {
  const activityDirectives: ActivityDirective[] = [
    {
      anchor_id: null,
      anchored_to_start: true,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 1,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'foo 1',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '10:00:00',
      tags: [],
      type: 'foo',
    },
    {
      anchor_id: null,
      anchored_to_start: false,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 2,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'foo 2',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '09:00:00',
      tags: [],
      type: 'foo',
    },
    {
      anchor_id: null,
      anchored_to_start: false,
      arguments: {},
      created_at: '2022-08-03T18:21:51',
      id: 3,
      last_modified_arguments_at: '2022-08-03T21:53:22',
      last_modified_at: '2022-08-03T21:53:22',
      metadata: {},
      name: 'foo 3',
      plan_id: 1,
      source_scheduling_goal_id: null,
      start_offset: '08:00:00',
      tags: [],
      type: 'foo',
    },
  ];

  test('Should properly sort directives in time ascending order', () => {
    expect(activityDirectives.sort(sortActivityDirectives)).toEqual(reverse(activityDirectives));
  });
});
