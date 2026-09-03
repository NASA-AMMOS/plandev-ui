import { get } from 'svelte/store';
import { afterEach, describe, expect, test } from 'vitest';
import {
  acquireTimelineResource,
  OVERSIZED_PROFILE_SEGMENT_COUNT,
  releaseTimelineResource,
  setTimelineResourceState,
  timelineResourcesOversized,
} from './timelineResourceStatus';

type Entry = { datasetId: number; name: string };

const acquired: Entry[] = [];

function seed(datasetId: number, name: string, kind: 'external' | 'sim', segmentCount?: number) {
  acquireTimelineResource(datasetId, name);
  acquired.push({ datasetId, name });
  setTimelineResourceState(datasetId, name, kind, { error: '', loading: false, resource: null, segmentCount });
}

afterEach(() => {
  // The registry is module-level, so unwind everything this test acquired.
  while (acquired.length > 0) {
    const entry = acquired.pop() as Entry;
    releaseTimelineResource(entry.datasetId, entry.name);
  }
});

describe('timelineResourcesOversized', () => {
  test('reports nothing below the threshold', () => {
    seed(1, 'small', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT - 1);
    expect(get(timelineResourcesOversized)).toEqual([]);
  });

  test('reports a profile at or above the threshold', () => {
    seed(1, 'big', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT);
    expect(get(timelineResourcesOversized)).toEqual([
      { kind: 'sim', name: 'big', segmentCount: OVERSIZED_PROFILE_SEGMENT_COUNT },
    ]);
  });

  test('treats a missing segmentCount as zero rather than warning', () => {
    seed(1, 'unknown', 'external', undefined);
    expect(get(timelineResourcesOversized)).toEqual([]);
  });

  test('dedupes the same profile shown on two rows, keeping the larger count', () => {
    // Two rows on different sim datasets can surface the same resource name; it is one modeling
    // problem, so it should be reported once.
    seed(1, 'shared', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT + 10);
    seed(2, 'shared', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT + 500);
    const oversized = get(timelineResourcesOversized);
    expect(oversized).toHaveLength(1);
    expect(oversized[0].segmentCount).toEqual(OVERSIZED_PROFILE_SEGMENT_COUNT + 500);
  });

  test('sorts the largest profile first', () => {
    seed(1, 'medium', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT + 1);
    seed(1, 'largest', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT + 9000);
    seed(1, 'large', 'external', OVERSIZED_PROFILE_SEGMENT_COUNT + 50);
    expect(get(timelineResourcesOversized).map(r => r.name)).toEqual(['largest', 'large', 'medium']);
  });

  test('clears once the resource is released', () => {
    seed(1, 'big', 'sim', OVERSIZED_PROFILE_SEGMENT_COUNT * 2);
    expect(get(timelineResourcesOversized)).toHaveLength(1);
    const entry = acquired.pop() as Entry;
    releaseTimelineResource(entry.datasetId, entry.name);
    expect(get(timelineResourcesOversized)).toEqual([]);
  });
});
