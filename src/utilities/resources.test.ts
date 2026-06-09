import { describe, expect, test } from 'vitest';
import type { Profile, Resource } from '../types/simulation';
import { sampleProfiles } from './resources';

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

  test('Emit a real profile segment with missing/null dynamics as a gap instead of crashing', () => {
    const profiles: Profile[] = [
      {
        dataset_id: 1,
        duration: '00:00:03',
        id: 1,
        name: '/real/with_gap',
        profile_segments: [
          {
            dataset_id: 1,
            dynamics: { initial: 10, rate: -0.5 },
            is_gap: false,
            profile_id: 1,
            start_offset: '00:00:00',
          },
          // Segment missing dynamics (e.g. a `{ duration }`-only external dataset segment) — previously crashed.
          { dataset_id: 1, dynamics: null, is_gap: false, profile_id: 1, start_offset: '00:00:01' },
          { dataset_id: 1, dynamics: { initial: 5, rate: 0 }, is_gap: false, profile_id: 1, start_offset: '00:00:02' },
        ],
        type: {
          schema: { items: { initial: { type: 'real' }, rate: { type: 'real' } }, type: 'struct' },
          type: 'real',
        },
      },
    ];

    const resources = sampleProfiles(profiles, '2022-09-01T00:00:00+00:00');

    expect(resources).toEqual([
      {
        name: '/real/with_gap',
        schema: { items: { initial: { type: 'real' }, rate: { type: 'real' } }, type: 'struct' },
        values: [
          { is_gap: false, x: 1661990400000, y: 10 },
          { is_gap: false, x: 1661990401000, y: 9.5 },
          { is_gap: true, x: 1661990401000, y: null },
          { is_gap: true, x: 1661990402000, y: null },
          { is_gap: false, x: 1661990402000, y: 5 },
          { is_gap: false, x: 1661990403000, y: 5 },
        ],
      },
    ]);
  });

  test('Skip a real profile segment whose dynamics is missing initial/rate', () => {
    const profiles: Profile[] = [
      {
        dataset_id: 1,
        duration: '00:00:01',
        id: 1,
        name: '/real/malformed',
        profile_segments: [
          {
            dataset_id: 1,
            dynamics: {} as Profile['profile_segments'][number]['dynamics'],
            is_gap: false,
            profile_id: 1,
            start_offset: '00:00:00',
          },
        ],
        type: {
          schema: { items: { initial: { type: 'real' }, rate: { type: 'real' } }, type: 'struct' },
          type: 'real',
        },
      },
    ];

    const resources = sampleProfiles(profiles, '2022-09-01T00:00:00+00:00');

    expect(resources).toEqual([
      {
        name: '/real/malformed',
        schema: { items: { initial: { type: 'real' }, rate: { type: 'real' } }, type: 'struct' },
        values: [],
      },
    ]);
  });
});
