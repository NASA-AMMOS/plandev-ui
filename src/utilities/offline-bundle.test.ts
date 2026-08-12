import { describe, expect, test } from 'vitest';
import fooBundle from '../tests/fixtures/foo-bundle.json';
import { OfflineBundleError, type OfflineBundle } from '../types/offline-bundle';
import { createSpanUtilityMaps } from './activities';
import {
  loadOfflineBundle,
  microsecondsToInterval,
  OFFLINE_DATASET_ID,
  parseDurationToMicroseconds,
  parseOfflineBundle,
  parseTimestampToMs,
  transformOfflineBundle,
} from './offline-bundle';
import { sampleProfiles } from './resources';
import { getIntervalInMs } from './time';

/** The golden fixture: `simpleFooPlan.json` + `simpleFooPlanResults.json` merged into bundle form. */
const fixtureText = JSON.stringify(fooBundle);

const MS = 1000;
const SECOND = 1e6;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

function minimalBundle(overrides: Partial<OfflineBundle> = {}): OfflineBundle {
  return {
    activityDirectives: [],
    bundleVersion: '1.0.0',
    plan: { duration: '24:00:00', name: 'test plan', startTime: '2024-07-01T00:00:00Z' },
    simulation: { simulationEndTime: '2024-07-02T00:00:00Z', simulationStartTime: '2024-07-01T00:00:00Z' },
    ...overrides,
  };
}

describe('parseDurationToMicroseconds', () => {
  test('parses Aerie signed durations', () => {
    expect(parseDurationToMicroseconds('+11:39:55.219000')).toBe(11 * HOUR + 39 * MINUTE + 55 * SECOND + 219000);
    expect(parseDurationToMicroseconds('-00:00:01')).toBe(-SECOND);
  });

  test('parses unsigned Postgres intervals', () => {
    expect(parseDurationToMicroseconds('02:27:15.059')).toBe(2 * HOUR + 27 * MINUTE + 15 * SECOND + 59000);
    expect(parseDurationToMicroseconds('24:00:00')).toBe(24 * HOUR);
  });

  test('does not roll hours into days', () => {
    expect(parseDurationToMicroseconds('30:00:00')).toBe(30 * HOUR);
  });

  test('parses ISO-8601 durations', () => {
    expect(parseDurationToMicroseconds('PT2H27M15.059S')).toBe(2 * HOUR + 27 * MINUTE + 15 * SECOND + 59000);
    expect(parseDurationToMicroseconds('P1DT1H')).toBe(25 * HOUR);
    expect(parseDurationToMicroseconds('-PT1M')).toBe(-MINUTE);
  });

  test('accepts raw microseconds', () => {
    expect(parseDurationToMicroseconds(2000000)).toBe(2000000);
    expect(parseDurationToMicroseconds(0)).toBe(0);
  });

  test('rejects malformed input', () => {
    for (const bad of ['', 'tomorrow', '1:2', 'P', 'PT', '00:99:00', null, undefined, NaN]) {
      expect(() => parseDurationToMicroseconds(bad as never)).toThrow(OfflineBundleError);
    }
  });
});

describe('microsecondsToInterval', () => {
  test('emits a string postgres-interval can read back', () => {
    // Round-tripping through the UI's own parser is the property that matters.
    for (const us of [0, SECOND, 2 * HOUR + 27 * MINUTE + 15 * SECOND + 59000, 24 * HOUR, 87 * 1000 * SECOND]) {
      expect(getIntervalInMs(microsecondsToInterval(us))).toBeCloseTo(us / MS, 6);
    }
  });

  test('keeps hours unrolled past 24', () => {
    expect(microsecondsToInterval(30 * HOUR)).toBe('30:00:00.000000');
  });

  test('pads fractional seconds to microsecond precision', () => {
    expect(microsecondsToInterval(59000)).toBe('00:00:00.059000');
  });
});

describe('parseTimestampToMs', () => {
  test('parses ISO-8601', () => {
    expect(parseTimestampToMs('2024-07-01T00:00:00Z')).toBe(Date.UTC(2024, 6, 1));
    expect(parseTimestampToMs('2024-07-01T00:00:00+00:00')).toBe(Date.UTC(2024, 6, 1));
  });

  test('parses Aerie day-of-year, treating day 1 as January 1st', () => {
    expect(parseTimestampToMs('2024-001T00:00:00')).toBe(Date.UTC(2024, 0, 1));
    // 2024 is a leap year, so day 183 is July 1st.
    expect(parseTimestampToMs('2024-183T00:00:00')).toBe(Date.UTC(2024, 6, 1));
    expect(parseTimestampToMs('2024-183T12:30:45.500')).toBe(Date.UTC(2024, 6, 1, 12, 30, 45, 500));
  });

  test('agrees between the two spellings the fixtures actually use', () => {
    expect(parseTimestampToMs('2024-183T00:00:00')).toBe(parseTimestampToMs('2024-07-01T00:00:00+00:00'));
  });

  test('rejects malformed input', () => {
    for (const bad of ['', 'never', null, undefined]) {
      expect(() => parseTimestampToMs(bad as never)).toThrow(OfflineBundleError);
    }
  });
});

describe('parseOfflineBundle', () => {
  test('accepts the golden fixture', () => {
    const bundle = parseOfflineBundle(fixtureText);
    expect(bundle.bundleVersion).toBe('1.0.0');
    expect(bundle.activityDirectives).toHaveLength(2);
    expect(bundle.simulation.resources).toHaveLength(18);
  });

  test('rejects non-JSON', () => {
    expect(() => parseOfflineBundle('{not json')).toThrow(/not valid JSON/);
  });

  test('reports every schema violation at once', () => {
    let details: string[] = [];
    try {
      parseOfflineBundle(JSON.stringify({ bundleVersion: '1.0.0' }));
    } catch (error) {
      details = (error as OfflineBundleError).details;
    }
    expect(details.length).toBeGreaterThan(1);
    expect(details.join('\n')).toMatch(/plan/);
  });

  test('rejects an unsupported major version', () => {
    const bundle = JSON.stringify(minimalBundle({ bundleVersion: '2.0.0' }));
    expect(() => parseOfflineBundle(bundle)).toThrow(/Unsupported bundle version 2\.0\.0/);
  });

  test('accepts a future minor version', () => {
    expect(() => parseOfflineBundle(JSON.stringify(minimalBundle({ bundleVersion: '1.9.3' })))).not.toThrow();
  });

  test('accepts snake_case aliases so an unmodified plan.json pastes in', () => {
    const bundle = parseOfflineBundle(
      JSON.stringify({
        activity_directives: [
          { anchor_id: null, anchored_to_start: true, id: 4, start_offset: '02:27:15.059', type: 'BasicFooActivity' },
        ],
        bundleVersion: '1.0.0',
        plan: { duration: '24:00:00', model_id: 4, name: 'p', start_time: '2024-07-01T00:00:00Z' },
        simulation: { simulationEndTime: '2024-07-02T00:00:00Z', simulationStartTime: '2024-07-01T00:00:00Z' },
      }),
    );
    expect(bundle.plan.modelId).toBe(4);
    expect(bundle.activityDirectives[0].startOffset).toBe('02:27:15.059');
    expect(bundle.activityDirectives[0].anchoredToStart).toBe(true);
  });

  test('does not rewrite alias-shaped keys inside opaque argument payloads', () => {
    const bundle = parseOfflineBundle(
      JSON.stringify(
        minimalBundle({
          activityDirectives: [
            { arguments: { nested: { anchor_id: 7 }, start_time: 'user data' }, id: 1, startOffset: 0, type: 'T' },
          ],
        }),
      ),
    );
    expect(bundle.activityDirectives[0].arguments).toEqual({ nested: { anchor_id: 7 }, start_time: 'user data' });
  });
});

describe('transformOfflineBundle', () => {
  const loaded = loadOfflineBundle(fixtureText);

  test('produces a plan the timeline can bound', () => {
    expect(loaded.plan.start_time).toBe('2024-07-01T00:00:00.000Z');
    expect(getIntervalInMs(loaded.plan.duration)).toBe(24 * 60 * 60 * 1000);
    expect(loaded.plan.is_locked).toBe(true);
  });

  test('converts activity directives, deriving start_time_ms', () => {
    const [basic] = loaded.activityDirectives;
    expect(basic.id).toBe(4);
    expect(basic.type).toBe('BasicFooActivity');
    expect(basic.start_time_ms).toBe(Date.UTC(2024, 6, 1) + (2 * 3600 + 27 * 60 + 15) * 1000 + 59);
    expect(basic.plan_id).toBe(3);
  });

  test('carries activity type parameter schemas through', () => {
    const spawner = loaded.activityTypes.find(({ name }) => name === 'DaemonCheckerSpawner');
    expect(spawner?.parameters.minutesElapsed.schema).toEqual({ type: 'int' });
    expect(spawner?.required_parameters).toContain('spawnDelay');
  });

  describe('spans', () => {
    test('nest directiveId, arguments and computedAttributes under attributes', () => {
      const basic = loaded.spans.find(({ span_id }) => span_id === 4);
      expect(basic?.attributes.directiveId).toBe(4);
      expect(basic?.attributes.arguments).toEqual({ duration: { amountInMicroseconds: 2000000 } });
      expect(basic?.attributes.computedAttributes).toEqual({});
    });

    test('omit directiveId entirely when the span is not from a directive', () => {
      const child = loaded.spans.find(({ span_id }) => span_id === 1);
      expect(child?.attributes).not.toHaveProperty('directiveId');
      expect(child?.parent_id).toBe(5);
    });

    test('derive millisecond fields consistently', () => {
      const basic = loaded.spans.find(({ span_id }) => span_id === 4);
      expect(basic?.startMs).toBe(Date.UTC(2024, 6, 1, 2, 27, 15, 59));
      expect(basic?.durationMs).toBe(2000);
      expect(basic?.endMs).toBe((basic?.startMs ?? 0) + 2000);
    });

    test("feed the UI's own span hierarchy builder", () => {
      const maps = createSpanUtilityMaps(loaded.spans);
      // childIds is dropped from the bundle; the hierarchy must survive via parent_id alone.
      expect(maps.spanIdToChildIdsMap[5]).toEqual([1]);
      expect(maps.directiveIdToSpanIdMap[4]).toBe(4);
      expect(maps.spanIdToDirectiveIdMap[4]).toBe(4);
    });
  });

  describe('resource profiles', () => {
    const counter = loaded.profiles.find(({ name }) => name === '/counter');

    test('prefix-sum segment extents into cumulative start_offsets', () => {
      expect(counter?.profile_segments).toHaveLength(87);
      // Every extent in /counter is 16m40s (1000s); offsets must accumulate, not repeat.
      expect(getIntervalInMs(counter!.profile_segments[0].start_offset)).toBe(0);
      expect(getIntervalInMs(counter!.profile_segments[1].start_offset)).toBe(1000 * 1000);
      expect(getIntervalInMs(counter!.profile_segments[2].start_offset)).toBe(2000 * 1000);
      expect(getIntervalInMs(counter!.profile_segments[86].start_offset)).toBe(86 * 1000 * 1000);
    });

    test('set duration to the end of the final segment', () => {
      // 86 segments of 1000s plus a final 400s remainder — exactly the 24h sim.
      expect(getIntervalInMs(counter!.profile_segments[86].start_offset)).toBe(86_000 * 1000);
      expect(getIntervalInMs(counter!.duration)).toBe(86_400 * 1000);
    });

    test('preserve real dynamics untouched', () => {
      const utcClock = loaded.profiles.find(({ name }) => name === '/utcClock');
      expect(utcClock?.type.type).toBe('real');
      expect(utcClock?.profile_segments[0].dynamics).toEqual({ initial: 0, rate: 1000 });
    });

    test('mark segments with null dynamics as gaps', () => {
      const withGap = transformOfflineBundle(
        minimalBundle({
          simulation: {
            resources: [
              {
                name: '/gappy',
                schema: { type: 'int' },
                segments: [
                  { dynamics: 1, extent: '01:00:00' },
                  { dynamics: null, extent: '01:00:00' },
                ],
                type: 'discrete',
              },
            ],
            simulationEndTime: '2024-07-02T00:00:00Z',
            simulationStartTime: '2024-07-01T00:00:00Z',
          },
        }),
      );
      expect(withGap.profiles[0].profile_segments[0].is_gap).toBe(false);
      expect(withGap.profiles[0].profile_segments[1].is_gap).toBe(true);
    });

    test("sample correctly through the UI's own sampleProfiles", () => {
      // The real consumer: proves the cumulative encoding is what it expects.
      const [sampled] = sampleProfiles([counter!], loaded.plan.start_time);
      expect(sampled.name).toBe('/counter');
      expect(sampled.values).toHaveLength(87 * 2);

      const planStart = Date.UTC(2024, 6, 1);
      expect(sampled.values[0]).toMatchObject({ x: planStart, y: 0 });
      expect(sampled.values[1]).toMatchObject({ x: planStart + 1000 * 1000, y: 0 });
      expect(sampled.values[2]).toMatchObject({ x: planStart + 1000 * 1000, y: 1 });
      // The step function must be monotonic in x and never collapse to a single instant.
      const xs = sampled.values.map(({ x }) => x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      // The profile must close at the end of the plan, not run past it.
      expect(xs[xs.length - 1]).toBe(planStart + 86_400 * 1000);
    });

    test('sample real profiles as linear ramps', () => {
      const [sampled] = sampleProfiles(
        [loaded.profiles.find(({ name }) => name === '/utcClock')!],
        loaded.plan.start_time,
      );
      // initial 0, rate 1000/s over 24h => 86_400_000.
      expect(sampled.values[0].y).toBe(0);
      expect(sampled.values[1].y).toBeCloseTo(86_400_000, 3);
    });
  });

  describe('simulation dataset', () => {
    test('reports a settled, successful run', () => {
      expect(loaded.simulationDataset.status).toBe('success');
      expect(loaded.simulationDataset.canceled).toBe(false);
      expect(loaded.simulationDataset.extent?.extent).toBe('24:00:00.000000');
    });

    test('shares one dataset id with every span and profile', () => {
      expect(loaded.simulationDataset.dataset_id).toBe(OFFLINE_DATASET_ID);
      for (const span of loaded.spans) {
        expect(span.dataset_id).toBe(OFFLINE_DATASET_ID);
      }
      for (const profile of loaded.profiles) {
        expect(profile.dataset_id).toBe(OFFLINE_DATASET_ID);
        for (const segment of profile.profile_segments) {
          expect(segment.dataset_id).toBe(OFFLINE_DATASET_ID);
        }
      }
    });
  });

  test('derives resource types from the resources themselves', () => {
    expect(loaded.resourceTypes).toHaveLength(18);
    expect(loaded.resourceTypes.find(({ name }) => name === '/counter')?.schema).toEqual({ type: 'int' });
  });

  test('leaves view null when the bundle embeds none', () => {
    expect(loaded.view).toBeNull();
  });

  test('passes an embedded view through for the route to migrate', () => {
    const view = { plan: { timelines: [] }, version: 3 };
    const loadedWithView = transformOfflineBundle(minimalBundle({ view } as never));
    expect(loadedWithView.view).toEqual(view);
  });

  describe('when simulation start differs from plan start', () => {
    // A sim that starts 1h into the plan: every offset must rebase onto plan start.
    const offset = transformOfflineBundle(
      minimalBundle({
        simulation: {
          resources: [
            { name: '/r', schema: { type: 'int' }, segments: [{ dynamics: 1, extent: '01:00:00' }], type: 'discrete' },
          ],
          simulationEndTime: '2024-07-01T03:00:00Z',
          simulationStartTime: '2024-07-01T01:00:00Z',
          spans: [{ duration: '00:30:00', id: 1, startOffset: '00:15:00', type: 'T' }],
        },
      }),
    );

    test('rebases span offsets onto plan start while keeping absolute times', () => {
      expect(getIntervalInMs(offset.spans[0].start_offset)).toBe(75 * 60 * 1000);
      expect(offset.spans[0].startMs).toBe(Date.UTC(2024, 6, 1, 1, 15));
    });

    test('rebases profile offsets onto plan start', () => {
      expect(getIntervalInMs(offset.profiles[0].profile_segments[0].start_offset)).toBe(60 * 60 * 1000);
      expect(getIntervalInMs(offset.profiles[0].duration)).toBe(2 * 60 * 60 * 1000);
    });
  });

  test('rejects a simulation that ends before it starts', () => {
    expect(() =>
      transformOfflineBundle(
        minimalBundle({
          simulation: { simulationEndTime: '2024-07-01T00:00:00Z', simulationStartTime: '2024-07-02T00:00:00Z' },
        }),
      ),
    ).toThrow(/before simulationStartTime/);
  });

  test('names the offending field when a duration is malformed', () => {
    expect(() =>
      transformOfflineBundle(minimalBundle({ activityDirectives: [{ id: 9, startOffset: 'soon', type: 'T' }] })),
    ).toThrow(/activity directive 9 startOffset/);
  });
});
