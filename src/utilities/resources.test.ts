import { describe, expect, test } from 'vitest';
import type { Profile, ProfileSegment, Resource, ResourceValue } from '../types/simulation';
import { pickEffectiveDuration } from './profile';
import { createProfileSampler, sampleProfiles } from './resources';
import { getIntervalInMs } from './time';

function appendAllLocal<T>(target: T[], source: readonly T[]) {
  for (let i = 0; i < source.length; ++i) {
    target.push(source[i]);
  }
}

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

/**
 * `sampleProfiles` carries each parsed `start_offset` into the following iteration instead of
 * parsing every offset twice. That is a pure performance change, so it must produce output
 * identical to the straightforward two-parse formulation. `referenceSampleProfiles` below is
 * that formulation, preserved verbatim as the oracle.
 */
function referenceSampleProfiles(profiles: Profile[] | null, startTimeYmd: string | null, offsetInterval?: string) {
  const resources: Resource[] = [];

  if (profiles && startTimeYmd) {
    const offsetMs = getIntervalInMs(offsetInterval);
    const start = new Date(startTimeYmd).getTime() + offsetMs;

    for (const profile of profiles) {
      const { duration, name, profile_segments, type: profileType } = profile;
      const { schema, type } = profileType;
      const durationMs = getIntervalInMs(duration);
      const values: ResourceValue[] = [];

      for (let i = 0; i < profile_segments.length; ++i) {
        const segment = profile_segments[i];
        const nextSegment = profile_segments[i + 1];

        const segmentOffset = getIntervalInMs(segment.start_offset);
        const nextSegmentOffset = nextSegment ? getIntervalInMs(nextSegment.start_offset) : durationMs;

        const { dynamics, is_gap } = segment;

        if (type === 'discrete') {
          values.push({ is_gap, x: start + segmentOffset, y: dynamics });
          values.push({ is_gap, x: start + nextSegmentOffset, y: dynamics });
        } else if (type === 'real') {
          values.push({ is_gap, x: start + segmentOffset, y: dynamics.initial });
          values.push({
            is_gap,
            x: start + nextSegmentOffset,
            y: dynamics.initial + dynamics.rate * ((nextSegmentOffset - segmentOffset) / 1000),
          });
        }
      }

      resources.push({ name, schema, values });
    }
  }

  return resources;
}

/** Deterministic PRNG (mulberry32) so failures are reproducible. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Renders `totalMs` in one of the Postgres interval spellings Hasura actually emits, so the
 * oracle comparison covers plain `HH:MM:SS`, fractional seconds at several precisions, and the
 * `N days HH:MM:SS` form.
 */
function formatInterval(totalMs: number, style: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const frac = Math.round((totalMs - totalSeconds * 1000) * 1000); // microseconds
  const days = Math.floor(totalSeconds / 86400);
  const rem = totalSeconds - days * 86400;
  const hh = Math.floor(rem / 3600);
  const mm = Math.floor((rem % 3600) / 60);
  const ss = rem % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (style === 0) {
    // hours accumulate past 24, no days component (what the sim writer produces)
    const totalHours = days * 24 + hh;
    return `${pad(totalHours)}:${pad(mm)}:${pad(ss)}`;
  }
  if (style === 1) {
    const totalHours = days * 24 + hh;
    return `${pad(totalHours)}:${pad(mm)}:${pad(ss)}.${String(frac).padStart(6, '0')}`;
  }
  if (style === 2) {
    const totalHours = days * 24 + hh;
    return `${pad(totalHours)}:${pad(mm)}:${pad(ss)}.${String(Math.floor(frac / 1000)).padStart(3, '0')}`;
  }
  // day form
  const dayPart = days === 1 ? '1 day' : `${days} days`;
  return `${dayPart} ${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(Math.floor(frac / 1000)).padStart(3, '0')}`;
}

describe('sampleProfiles carry-forward equivalence', () => {
  test('matches the two-parse reference across randomized real and discrete profiles', () => {
    const rng = makeRng(0xc0ffee);
    let checked = 0;

    for (let iteration = 0; iteration < 300; ++iteration) {
      const isReal = rng() < 0.5;
      const segmentCount = Math.floor(rng() * 12); // include 0- and 1-segment profiles
      const style = iteration % 4;

      // strictly increasing offsets, mixed magnitudes incl. multi-day
      const offsets: number[] = [];
      let cursor = Math.floor(rng() * 1000);
      for (let i = 0; i < segmentCount; ++i) {
        offsets.push(cursor);
        cursor += 1 + Math.floor(rng() * 5_000_000);
      }

      const durationMs = segmentCount > 0 ? offsets[offsets.length - 1] + 1 + Math.floor(rng() * 1_000_000) : 1000;

      const profile: Profile = isReal
        ? realProfile(
            formatInterval(durationMs, style),
            offsets.map(off => ({
              initial: (rng() - 0.5) * 1e6,
              is_gap: rng() < 0.15,
              rate: (rng() - 0.5) * 1e3,
              start_offset: formatInterval(off, style),
            })),
          )
        : discreteProfile(
            formatInterval(durationMs, style),
            offsets.map(off => ({
              is_gap: rng() < 0.15,
              start_offset: formatInterval(off, style),
              value: rng() < 0.5 ? `state-${Math.floor(rng() * 5)}` : Math.floor(rng() * 100),
            })),
          );

      const offsetInterval = iteration % 3 === 0 ? formatInterval(Math.floor(rng() * 100000), 1) : undefined;

      expect(sampleProfiles([profile], START, offsetInterval)).toEqual(
        referenceSampleProfiles([profile], START, offsetInterval),
      );
      checked++;
    }

    expect(checked).toEqual(300);
  });

  test('boundary cases the randomized generator cannot hit', () => {
    const cases: Profile[] = [
      // zero segments
      realProfile('00:10:00', []),
      // single segment: closing x must come from duration, not a successor
      realProfile('00:10:00', [{ initial: 5, rate: 2, start_offset: '00:00:00' }]),
      // duration shorter than the last start_offset (documented garbage-in case)
      realProfile('00:00:30', [
        { initial: 0, rate: 1, start_offset: '00:00:00' },
        { initial: 9, rate: 1, start_offset: '00:01:00' },
      ]),
      // identical consecutive offsets -> zero-length segment
      realProfile('00:10:00', [
        { initial: 1, rate: 1, start_offset: '00:00:05' },
        { initial: 2, rate: 1, start_offset: '00:00:05' },
      ]),
      // day-form offsets mixed with plain, as in the fixture above
      realProfile('4 days 03:10:21.295', [
        { initial: 0, rate: 0, start_offset: '00:00:00' },
        { initial: 0, rate: 5, start_offset: '2 days 19:40:54.345' },
      ]),
      // negative sentinel offset (INITIAL_SINCE shape)
      realProfile('00:10:00', [{ initial: 3, rate: 0, start_offset: '-00:00:01' }]),
    ];

    for (const profile of cases) {
      expect(sampleProfiles([profile], START)).toEqual(referenceSampleProfiles([profile], START));
    }
  });
});

describe('createProfileSampler', () => {
  /**
   * The sampler retains samples across calls and re-samples only the tail. Feeding it segments in
   * arbitrary batches must therefore produce exactly what a single full `sampleProfiles` pass
   * produces over the same final segment list — including the closing value of the final segment,
   * which moves as `duration` advances.
   */
  test('incremental arrival matches a full sampleProfiles pass, across randomized batch splits', () => {
    const rng = makeRng(0x5eed);

    for (let iteration = 0; iteration < 200; ++iteration) {
      const isReal = rng() < 0.5;
      const segmentCount = 1 + Math.floor(rng() * 25);
      const style = iteration % 4;

      const offsets: number[] = [];
      let cursor = Math.floor(rng() * 1000);
      for (let i = 0; i < segmentCount; ++i) {
        offsets.push(cursor);
        cursor += 1 + Math.floor(rng() * 2_000_000);
      }

      const allSegments: ProfileSegment[] = offsets.map(off =>
        makeSegment(
          formatInterval(off, style),
          isReal ? { initial: (rng() - 0.5) * 1e5, rate: (rng() - 0.5) * 1e2 } : `state-${Math.floor(rng() * 4)}`,
          rng() < 0.15,
        ),
      );

      const profileType = isReal
        ? ({ schema: { type: 'real' }, type: 'real' } as Profile['type'])
        : ({ schema: { type: 'string' }, type: 'discrete' } as Profile['type']);

      // Split into 1..5 arrival batches, mimicking windowed pulls during a streaming sim.
      const batchCount = 1 + Math.floor(rng() * 5);
      const cuts = new Set<number>([segmentCount]);
      for (let b = 1; b < batchCount; ++b) {
        cuts.add(1 + Math.floor(rng() * segmentCount));
      }
      const boundaries = [...cuts].sort((a, b) => a - b);

      const sampler = createProfileSampler(START);
      const accumulator: ProfileSegment[] = [];
      let incremental: Resource | null = null;

      for (let b = 0; b < boundaries.length; ++b) {
        const upTo = boundaries[b];
        const isLastBatch = b === boundaries.length - 1;
        accumulator.length = 0;
        appendAllLocal(accumulator, allSegments.slice(0, upTo));
        const arrived = accumulator;

        // Mirror the stores: while streaming, close at the last received offset; once terminal,
        // use the header duration.
        const headerDuration = formatInterval(offsets[segmentCount - 1] + 500_000, style);
        const duration = pickEffectiveDuration(headerDuration, arrived[arrived.length - 1].start_offset, !isLastBatch);

        incremental = sampler.sample({ duration, name: 'r', profileType, segments: accumulator });

        // Every intermediate emit must also equal a full pass over what has arrived so far.
        const expectedSoFar = sampleProfiles(
          [{ dataset_id: 1, duration, id: 1, name: 'r', profile_segments: arrived, type: profileType }],
          START,
        )[0];
        expect(incremental.values).toEqual(expectedSoFar.values);
      }

      expect(incremental).not.toBeNull();
    }
  });

  test('applies and re-bases offsetInterval, resampling when it changes', () => {
    const profileType = { schema: { type: 'real' }, type: 'real' } as Profile['type'];
    const segments = [
      makeSegment('00:00:00', { initial: 1, rate: 0 }),
      makeSegment('00:00:10', { initial: 2, rate: 0 }),
    ];
    const sampler = createProfileSampler(START);

    const noOffset = sampler.sample({ duration: '00:00:20', name: 'r', profileType, segments });
    expect(noOffset.values[0].x).toEqual(startMs);

    // A different plan_dataset row can change the offset; retained samples must be discarded.
    const shifted = sampler.sample({
      duration: '00:00:20',
      name: 'r',
      offsetInterval: '00:00:05',
      profileType,
      segments,
    });
    expect(shifted.values.map(v => v.x)).toEqual(noOffset.values.map(v => v.x + 5000));

    const backAgain = sampler.sample({ duration: '00:00:20', name: 'r', profileType, segments });
    expect(backAgain.values).toEqual(noOffset.values);
  });

  test('reset discards retained samples so a shorter profile does not inherit stale values', () => {
    const profileType = { schema: { type: 'real' }, type: 'real' } as Profile['type'];
    const long = [
      makeSegment('00:00:00', { initial: 1, rate: 0 }),
      makeSegment('00:00:10', { initial: 2, rate: 0 }),
      makeSegment('00:00:20', { initial: 3, rate: 0 }),
    ];
    const short = [makeSegment('00:00:00', { initial: 9, rate: 0 })];

    const sampler = createProfileSampler(START);
    sampler.sample({ duration: '00:00:30', name: 'r', profileType, segments: long });
    sampler.reset();
    const after = sampler.sample({ duration: '00:00:05', name: 'r', profileType, segments: short });

    expect(after.values).toEqual(
      sampleProfiles(
        [{ dataset_id: 1, duration: '00:00:05', id: 1, name: 'r', profile_segments: short, type: profileType }],
        START,
      )[0].values,
    );
  });

  test('auto-resets when the profile type changes', () => {
    const segments = [makeSegment('00:00:00', 'A'), makeSegment('00:00:10', 'B')];
    const realSegments = [makeSegment('00:00:00', { initial: 1, rate: 1 })];
    const sampler = createProfileSampler(START);

    sampler.sample({
      duration: '00:00:20',
      name: 'r',
      profileType: { schema: { type: 'string' }, type: 'discrete' } as Profile['type'],
      segments,
    });
    const asReal = sampler.sample({
      duration: '00:00:10',
      name: 'r',
      profileType: { schema: { type: 'real' }, type: 'real' } as Profile['type'],
      segments: realSegments,
    });

    expect(asReal.values).toEqual([
      { is_gap: false, x: startMs, y: 1 },
      { is_gap: false, x: startMs + 10000, y: 11 },
    ]);
  });

  // Load-bearing for two consumers: LayerLine iterates values across rAF frames, and
  // getYAxisBounds memoizes per-array facts in a WeakMap keyed on array identity — a reused array
  // would be a cache hit against stale bounds, producing a wrong chart rather than a slow one.
  test('hands out a snapshot so a prior emit is not mutated by the next', () => {
    const profileType = { schema: { type: 'real' }, type: 'real' } as Profile['type'];
    const sampler = createProfileSampler(START);
    const segments = [makeSegment('00:00:00', { initial: 1, rate: 0 })];

    const first = sampler.sample({ duration: '00:00:10', name: 'r', profileType, segments });
    const firstSnapshot = first.values.map(v => ({ ...v }));

    segments.push(makeSegment('00:00:10', { initial: 2, rate: 0 }));
    const second = sampler.sample({ duration: '00:00:20', name: 'r', profileType, segments });

    expect(second.values).toHaveLength(4);
    expect(first.values).toEqual(firstSnapshot);
    expect(first.values).not.toBe(second.values);
  });
});
