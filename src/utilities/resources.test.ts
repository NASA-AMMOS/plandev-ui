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
});
