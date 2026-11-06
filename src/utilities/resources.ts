import type { Profile, ProfileSegment, Resource, ResourceValue } from '../types/simulation';
import { getIntervalInMs } from './time';

// First-fetch sentinel for windowed profile pulls: smaller than any real
// start_offset, so the windowed query returns every existing segment.
// Postgres interval syntax (HH:MM:SS) — Hasura's interval scalar rejects
// ISO 8601.
export const INITIAL_SINCE = '-00:00:01';

/**
 * Appends the samples for `segments[fromSegment..]` onto `values`, producing two values per
 * segment (its start, and its close at the following segment's offset — or at `durationMs` for
 * the final segment).
 *
 * Shared by `sampleProfiles` (full pass) and `createProfileSampler` (tail pass) so both are
 * guaranteed to produce identical output.
 */
function appendSegmentSamples(
  values: ResourceValue[],
  segments: ProfileSegment[],
  fromSegment: number,
  type: 'discrete' | 'real',
  start: number,
  durationMs: number,
): void {
  const segmentCount = segments.length;

  // Carry each parsed offset into the following iteration rather than parsing it twice.
  let segmentOffset = fromSegment < segmentCount ? getIntervalInMs(segments[fromSegment].start_offset) : 0;

  for (let i = fromSegment; i < segmentCount; ++i) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];

    const nextSegmentOffset = nextSegment ? getIntervalInMs(nextSegment.start_offset) : durationMs;

    const { dynamics, is_gap } = segment;

    if (type === 'discrete') {
      values.push({
        is_gap,
        x: start + segmentOffset,
        y: dynamics,
      });
      values.push({
        is_gap,
        x: start + nextSegmentOffset,
        y: dynamics,
      });
    } else if (type === 'real') {
      values.push({
        is_gap,
        x: start + segmentOffset,
        y: dynamics.initial,
      });
      values.push({
        is_gap,
        x: start + nextSegmentOffset,
        y: dynamics.initial + dynamics.rate * ((nextSegmentOffset - segmentOffset) / 1000),
      });
    }

    segmentOffset = nextSegmentOffset;
  }
}

/**
 * Samples a list of profiles at their change points. Converts the sampled profiles to Resources.
 */
export function sampleProfiles(
  profiles: Profile[] | null,
  startTimeYmd: string | null,
  offsetInterval?: string,
): Resource[] {
  const resources: Resource[] = [];

  if (profiles && startTimeYmd) {
    const offsetMs = getIntervalInMs(offsetInterval);
    const start = new Date(startTimeYmd).getTime() + offsetMs;

    for (const profile of profiles) {
      const { duration, name, profile_segments, type: profileType } = profile;
      const { schema, type } = profileType;
      const durationMs = getIntervalInMs(duration);
      const values: ResourceValue[] = [];

      appendSegmentSamples(values, profile_segments, 0, type, start, durationMs);

      resources.push({ name, schema, values });
    }
  }

  return resources;
}

export type ProfileSampleRequest = {
  /** Effective duration interval — see `pickEffectiveDuration`. */
  duration: string;
  name: string;
  /** Offset applied to every x, for external datasets. Changing it forces a full re-sample. */
  offsetInterval?: string;
  profileType: Profile['type'];
  /** Every segment received so far; the sampler re-samples only the tail it needs. */
  segments: ProfileSegment[];
};

export type ProfileSampler = {
  /**
   * Discard retained samples so the next `sample` call rebuilds from scratch. Call this whenever
   * the caller's segment accumulator is cleared or repointed at a different profile.
   */
  reset: () => void;
  sample: (request: ProfileSampleRequest) => Resource;
};

/**
 * Incremental counterpart to `sampleProfiles` for the windowed-pull resource stores.
 *
 * Retains samples across calls and only re-samples the tail. The last sampled segment must be
 * rebuilt because its provisional end moves until a successor supplies the final offset.
 */
export function createProfileSampler(startTimeYmd: string): ProfileSampler {
  const baseStart = new Date(startTimeYmd).getTime();

  let values: ResourceValue[] = [];
  let sampledSegments = 0;
  let lastType: string | null = null;
  let lastOffsetInterval: string | undefined;
  let lastStart = baseStart;

  function reset() {
    values = [];
    sampledSegments = 0;
  }

  return {
    reset,
    sample({ duration, name, offsetInterval, profileType, segments }: ProfileSampleRequest): Resource {
      const { schema, type } = profileType;

      // Offset and type changes reinterpret retained samples; callers retain segments for rebuilds.
      if (offsetInterval !== lastOffsetInterval) {
        lastOffsetInterval = offsetInterval;
        lastStart = baseStart + getIntervalInMs(offsetInterval);
        reset();
      }
      if (type !== lastType || segments.length < sampledSegments) {
        reset();
      }
      lastType = type;

      // The most recently sampled segment closed at the then-current durationMs, which the next
      // arriving segment (or an advancing extent) supersedes. Drop that pair and re-sample it.
      const fromSegment = sampledSegments > 0 ? sampledSegments - 1 : 0;
      values.length = fromSegment * 2;

      appendSegmentSamples(values, segments, fromSegment, type, lastStart, getIntervalInMs(duration));
      sampledSegments = segments.length;

      // Return a snapshot: frame-sliced consumers must not observe later mutations,
      // and axis metadata is cached by array identity.
      return { name, schema, values: values.slice() };
    },
  };
}
