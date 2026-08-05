import type { Profile, Resource, ResourceValue } from '../types/simulation';
import { getIntervalInMs } from './time';

// First-fetch sentinel for windowed profile pulls: smaller than any real
// start_offset, so the windowed query returns every existing segment.
// Postgres interval syntax (HH:MM:SS) — Hasura's interval scalar rejects
// ISO 8601.
export const INITIAL_SINCE = '-00:00:01';

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

      for (let i = 0; i < profile_segments.length; ++i) {
        const segment = profile_segments[i];
        const nextSegment = profile_segments[i + 1];

        const segmentOffset = getIntervalInMs(segment.start_offset);
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
            // Tagged rather than inferred: a real segment with a rate of 0 also produces two values
            // with the same y, and dropping *its* closing value would turn a flat run followed by a
            // jump into a ramp. Only the profile type knows the difference, and only here.
            is_hold: true,
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
      }

      resources.push({ name, schema, values });
    }
  }

  return resources;
}
