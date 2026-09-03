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

  // Each segment's end offset is the next segment's start offset, so parse each start_offset
  // once and carry it into the following iteration rather than parsing every offset twice.
  // Interval parsing is ~69% of this function's cost.
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
  /** Only the segments not yet sampled. The sampler retains what it needs from earlier calls. */
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
 * Those stores accumulate segments and re-emit on every simulation-extent tick. Re-sampling the
 * whole accumulator each time is O(total) work per tick, which grows without bound over a long
 * simulation. This retains the samples across calls and only re-samples the tail.
 *
 * Correctness rests on one property: segment `i` closes at segment `i+1`'s offset, so once a
 * successor exists that pair is final. Only the last sampled segment is provisional — it closes
 * at `durationMs`, which moves as the simulation advances — so we drop exactly that pair and
 * re-sample from there. Output is identical to a full `sampleProfiles` pass; the equivalence is
 * pinned by a randomized oracle test in `resources.test.ts`.
 */
export function createProfileSampler(startTimeYmd: string): ProfileSampler {
  const baseStart = new Date(startTimeYmd).getTime();

  let values: ResourceValue[] = [];
  let lastType: string | null = null;
  let lastOffsetInterval: string | undefined;
  let lastStart = baseStart;

  // The last appended segment, whose closing value is provisional: it sits at `duration`, which
  // advances while a simulation runs. Rewriting it needs that segment's own dynamics, so exactly one
  // segment is retained -- which is what lets callers stop retaining all of them. The raw
  // ProfileSegment[] accumulator measured 202 B/segment, the largest of the three retained
  // representations of a profile.
  let pending: { offsetMs: number; segment: ProfileSegment } | null = null;

  function reset() {
    values = [];
    pending = null;
  }

  return {
    reset,
    sample({ duration, name, offsetInterval, profileType, segments }: ProfileSampleRequest): Resource {
      const { schema, type } = profileType;

      // Anything that shifts or reinterprets already-sampled values invalidates them: a changed
      // x offset (external datasets can repoint at a different plan_dataset row), or a changed
      // profile type.
      if (offsetInterval !== lastOffsetInterval) {
        lastOffsetInterval = offsetInterval;
        lastStart = baseStart + getIntervalInMs(offsetInterval);
        reset();
      }
      if (type !== lastType) {
        reset();
      }
      lastType = type;

      const durationMs = getIntervalInMs(duration);

      function valueAt(segment: ProfileSegment, startOffsetMs: number, endOffsetMs: number) {
        const { dynamics } = segment;
        if (type === 'real') {
          return dynamics === null ? null : dynamics.initial + dynamics.rate * ((endOffsetMs - startOffsetMs) / 1000);
        }
        return dynamics;
      }

      // Discard the pending segment's provisional closing value, then rewrite it against whatever
      // now follows: the first newly-arrived segment, or an advanced duration if none arrived.
      if (pending !== null && values.length > 0) {
        values.length -= 1;
      }

      const firstNewOffset = segments.length > 0 ? getIntervalInMs(segments[0].start_offset) : durationMs;

      if (pending !== null) {
        values.push({
          is_gap: pending.segment.is_gap,
          x: lastStart + firstNewOffset,
          y: valueAt(pending.segment, pending.offsetMs, firstNewOffset),
        });
      }

      let offset = firstNewOffset;
      for (let i = 0; i < segments.length; ++i) {
        const segment = segments[i];
        const nextSegment = segments[i + 1];
        const nextOffset = nextSegment ? getIntervalInMs(nextSegment.start_offset) : durationMs;
        const { is_gap } = segment;

        values.push({ is_gap, x: lastStart + offset, y: valueAt(segment, offset, offset) });
        values.push({ is_gap, x: lastStart + nextOffset, y: valueAt(segment, offset, nextOffset) });

        if (i === segments.length - 1) {
          pending = { offsetMs: offset, segment };
        }
        offset = nextOffset;
      }

      // Hand out a snapshot rather than the retained array. Consumers (notably the rAF
      // time-sliced point conversion in LayerLine) iterate `values` across frames, so mutating
      // an array they already hold would let them observe a torn state. This copies pointers
      // only — no per-value allocation, which is the expensive part being avoided.
      return { name, schema, values: values.slice() };
    },
  };
}
