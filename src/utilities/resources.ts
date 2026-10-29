import type { Profile, RealDynamics, Resource, ResourceValue } from '../types/simulation';
import { getIntervalInMs } from './time';

// First-fetch sentinel for windowed profile pulls: smaller than any real
// start_offset, so the windowed query returns every existing segment.
// Postgres interval syntax (HH:MM:SS) — Hasura's interval scalar rejects
// ISO 8601.
export const INITIAL_SINCE = '-00:00:01';

function isRealDynamics(dynamics: unknown): dynamics is RealDynamics {
  return (
    typeof dynamics === 'object' &&
    dynamics !== null &&
    typeof (dynamics as RealDynamics).initial === 'number' &&
    typeof (dynamics as RealDynamics).rate === 'number'
  );
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

      for (let i = 0; i < profile_segments.length; ++i) {
        const segment = profile_segments[i];
        const nextSegment = profile_segments[i + 1];

        const segmentOffset = getIntervalInMs(segment.start_offset);
        const nextSegmentOffset = nextSegment ? getIntervalInMs(nextSegment.start_offset) : durationMs;

        const { dynamics, is_gap } = segment;

        if (type === 'discrete') {
          // Discrete dynamics is a SerializedValue; JSON null is a legitimate value. is_gap is the discriminator.
          values.push({
            is_gap,
            x: start + segmentOffset,
            y: dynamics as ResourceValue['y'],
          });
          values.push({
            is_gap,
            x: start + nextSegmentOffset,
            y: dynamics as ResourceValue['y'],
          });
        } else if (type === 'real') {
          // Gaps, missing dynamics, and malformed dynamics all render as unknown (y: null breaks the line).
          const known = !is_gap && isRealDynamics(dynamics);
          values.push({
            is_gap: !known,
            x: start + segmentOffset,
            y: known ? dynamics.initial : null,
          });
          values.push({
            is_gap: !known,
            x: start + nextSegmentOffset,
            y: known ? dynamics.initial + dynamics.rate * ((nextSegmentOffset - segmentOffset) / 1000) : null,
          });
        }
      }

      resources.push({ name, schema, values });
    }
  }

  return resources;
}
