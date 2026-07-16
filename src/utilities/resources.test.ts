import { describe, expect, test } from 'vitest';
import type { Profile, ProfileSegment, Resource } from '../types/simulation';
import { sampleProfiles } from './resources';

const START = '2024-01-01T00:00:00';
const startMs = new Date(START).getTime();

type DiscreteSeg = { is_gap?: boolean; start_offset: string; value: any };
type RealSeg = { initial: number; is_gap?: boolean; rate: number; start_offset: string };

function makeSegment(start_offset: string, dynamics: any, is_gap = false): ProfileSegment {
  return { dataset_id: 1, dynamics, is_gap, profile_id: 1, start_offset };
}

function discreteProfile(duration: string, segments: DiscreteSeg[]): Profile {
  return {
    dataset_id: 1,
    duration,
    id: 1,
    name: 'r',
    profile_segments: segments.map(s => makeSegment(s.start_offset, s.value, s.is_gap)),
    type: { schema: { type: 'string' } as any, type: 'discrete' },
  };
}

function realProfile(duration: string, segments: RealSeg[]): Profile {
  return {
    dataset_id: 1,
    duration,
    id: 1,
    name: 'r',
    profile_segments: segments.map(s => makeSegment(s.start_offset, { initial: s.initial, rate: s.rate }, s.is_gap)),
    type: { schema: { type: 'real' } as any, type: 'real' },
  };
}

describe('sampleProfiles', () => {
  test('Calculate the correct y-value for real profile segment rate of change', () => {
    const profiles: Profile[] = [
      {
        dataset_id: 1,
        duration: '384:00:00',
        id: 1,
        name: '/simple_data/b/volume',
        profile_segments: [
          {
            dataset_id: 1,
            dynamics: { initial: 0, rate: 0 },
            is_gap: false,
            profile_id: 1,
            start_offset: '00:00:00',
          },
          {
            dataset_id: 1,
            dynamics: { initial: 0, rate: 5 },
            is_gap: false,
            profile_id: 1,
            start_offset: '2 days 19:40:54.345',
          },
          {
            dataset_id: 1,
            dynamics: { initial: 566834.75, rate: 0 },
            is_gap: false,
            profile_id: 1,
            start_offset: '4 days 03:10:21.295',
          },
        ],
        type: {
          schema: {
            items: { initial: { type: 'real' }, rate: { type: 'real' } },
            type: 'struct',
          },
          type: 'real',
        },
      },
      {
        dataset_id: 1,
        duration: '384:00:00',
        id: 2,
        name: '/simple_data/activities_executed',
        profile_segments: [
          {
            dataset_id: 1,
            dynamics: 0,
            is_gap: false,
            profile_id: 2,
            start_offset: '00:00:00',
          },
          {
            dataset_id: 1,
            dynamics: 2,
            is_gap: false,
            profile_id: 2,
            start_offset: '2 days 19:40:54.345',
          },
          {
            dataset_id: 1,
            dynamics: 4,
            is_gap: false,
            profile_id: 2,
            start_offset: '4 days 03:10:21.295',
          },
        ],
        type: {
          schema: { type: 'int' },
          type: 'discrete',
        },
      },
    ];

    const resources: Resource[] = sampleProfiles(profiles, '2022-09-01T00:00:00+00:00');

    const expectedResources: Resource[] = [
      {
        name: '/simple_data/b/volume',
        schema: {
          items: { initial: { type: 'real' }, rate: { type: 'real' } },
          type: 'struct',
        },
        values: [
          { is_gap: false, x: 1661990400000, y: 0 },
          { is_gap: false, x: 1662234054345, y: 0 },
          { is_gap: false, x: 1662234054345, y: 0 },
          { is_gap: false, x: 1662347421295, y: 566834.75 },
          { is_gap: false, x: 1662347421295, y: 566834.75 },
          { is_gap: false, x: 1663372800000, y: 566834.75 },
        ],
      },
      {
        name: '/simple_data/activities_executed',
        schema: { type: 'int' },
        values: [
          { is_gap: false, x: 1661990400000, y: 0 },
          { is_gap: false, x: 1662234054345, y: 0 },
          { is_gap: false, x: 1662234054345, y: 2 },
          { is_gap: false, x: 1662347421295, y: 2 },
          { is_gap: false, x: 1662347421295, y: 4 },
          { is_gap: false, x: 1663372800000, y: 4 },
        ],
      },
    ];

    expect(resources).toEqual(expectedResources);
  });

  test('returns [] when profiles is null', () => {
    expect(sampleProfiles(null, START)).toEqual([]);
  });

  test('returns [] when startTimeYmd is null', () => {
    expect(sampleProfiles([discreteProfile('00:01:00', [])], null)).toEqual([]);
  });

  test('returns one resource with empty values for a profile with no segments', () => {
    const result = sampleProfiles([discreteProfile('00:01:00', [])], START);
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('r');
    expect(result[0].values).toEqual([]);
  });

  describe('discrete profile', () => {
    test('produces two values per segment using the next segment start as second x', () => {
      const profile = discreteProfile('00:01:00', [
        { start_offset: '00:00:00', value: 'A' },
        { start_offset: '00:00:30', value: 'B' },
      ]);
      const [resource] = sampleProfiles([profile], START);
      expect(resource.values).toEqual([
        { is_gap: false, x: startMs + 0, y: 'A' },
        { is_gap: false, x: startMs + 30000, y: 'A' },
        { is_gap: false, x: startMs + 30000, y: 'B' },
        { is_gap: false, x: startMs + 60000, y: 'B' },
      ]);
    });

    test('uses durationMs for the closing x of the last segment', () => {
      const profile = discreteProfile('00:02:00', [{ start_offset: '00:00:30', value: 'A' }]);
      const [resource] = sampleProfiles([profile], START);
      expect(resource.values).toEqual([
        { is_gap: false, x: startMs + 30000, y: 'A' },
        { is_gap: false, x: startMs + 120000, y: 'A' },
      ]);
    });

    test('propagates is_gap to both values produced by a gap segment', () => {
      const profile = discreteProfile('00:01:00', [{ is_gap: true, start_offset: '00:00:00', value: 'X' }]);
      const [resource] = sampleProfiles([profile], START);
      expect(resource.values.every(v => v.is_gap === true)).toBe(true);
    });
  });

  describe('real profile', () => {
    test('uses dynamics.initial as the segment-start y value', () => {
      const profile = realProfile('00:01:00', [{ initial: 50, rate: 0, start_offset: '00:00:00' }]);
      const [resource] = sampleProfiles([profile], START);
      expect(resource.values[0]).toEqual({ is_gap: false, x: startMs, y: 50 });
    });

    test('connects consecutive segments at the same x with their respective y values', () => {
      const profile = realProfile('00:02:00', [
        { initial: 0, rate: 0, start_offset: '00:00:00' },
        { initial: 10, rate: 0, start_offset: '00:01:00' },
      ]);
      const [resource] = sampleProfiles([profile], START);
      expect(resource.values[1].x).toEqual(resource.values[2].x);
      expect(resource.values[1].y).toEqual(0);
      expect(resource.values[2].y).toEqual(10);
    });
  });

  describe('sort invariants', () => {
    test('values are sorted ASC by x when duration >= max segment start_offset', () => {
      const profile = discreteProfile('00:05:00', [
        { start_offset: '00:00:00', value: 'A' },
        { start_offset: '00:01:00', value: 'B' },
        { start_offset: '00:02:00', value: 'C' },
        { start_offset: '00:03:00', value: 'D' },
      ]);
      const [resource] = sampleProfiles([profile], START);
      const xs = resource.values.map(v => v.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
    });

    // Pin: if duration < last segment offset, the closing value lands before
    // its own open x and decimation breaks. profile.ts guards this via
    // pickEffectiveDuration; this test catches a "be lenient" regression.
    test('garbage-in: values are NOT sorted when duration < last segment start_offset', () => {
      const profile = discreteProfile('00:00:00', [
        { start_offset: '00:00:00', value: 'A' },
        { start_offset: '00:01:00', value: 'B' },
      ]);
      const [resource] = sampleProfiles([profile], START);
      const xs = resource.values.map(v => v.x);
      const sorted = [...xs].sort((a, b) => a - b);
      expect(xs).not.toEqual(sorted);
    });

    test('produces only finite x and y for well-formed real-typed input', () => {
      const profile = realProfile('00:10:00', [
        { initial: 0, rate: 1, start_offset: '00:00:00' },
        { initial: 5, rate: -1, start_offset: '00:05:00' },
      ]);
      const [resource] = sampleProfiles([profile], START);
      for (const v of resource.values) {
        expect(Number.isFinite(v.x)).toBe(true);
        expect(typeof v.y === 'number' && Number.isFinite(v.y)).toBe(true);
      }
    });
  });

  test('offsetInterval shifts every x by the offset', () => {
    const profile = discreteProfile('00:01:00', [{ start_offset: '00:00:00', value: 'A' }]);
    const [resource] = sampleProfiles([profile], START, '00:00:10');
    expect(resource.values).toEqual([
      { is_gap: false, x: startMs + 10000, y: 'A' },
      { is_gap: false, x: startMs + 70000, y: 'A' },
    ]);
  });

  test('handles multiple profiles independently', () => {
    const a = discreteProfile('00:01:00', [{ start_offset: '00:00:00', value: 'A' }]);
    a.name = 'a';
    const b = discreteProfile('00:01:00', [{ start_offset: '00:00:00', value: 'B' }]);
    b.name = 'b';
    const result = sampleProfiles([a, b], START);
    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('a');
    expect(result[1].name).toEqual('b');
  });
});
