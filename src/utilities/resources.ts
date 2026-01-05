import type { Profile, RealDynamics, Resource, ResourceValue } from '../types/simulation';
import { getIntervalInMs } from './time';

/**
 * Type guard to check if dynamics represents a real profile (linear interpolation).
 */
function isRealDynamics(dynamics: unknown): dynamics is RealDynamics {
  return (
    typeof dynamics === 'object' &&
    dynamics !== null &&
    'initial' in dynamics &&
    'rate' in dynamics &&
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

        // Compute y values based on segment type
        let startY: ResourceValue['y'];
        let endY: ResourceValue['y'];
        let segmentIsGap: boolean;

        if (is_gap || dynamics == null) {
          segmentIsGap = true;
          startY = null;
          endY = null;
        } else if (type === 'real' && isRealDynamics(dynamics)) {
          segmentIsGap = false;
          startY = dynamics.initial;
          endY = dynamics.initial + dynamics.rate * ((nextSegmentOffset - segmentOffset) / 1000);
        } else if (type === 'discrete') {
          // Discrete - dynamics is the value itself
          segmentIsGap = false;
          startY = dynamics as ResourceValue['y'];
          endY = dynamics as ResourceValue['y'];
        } else {
          // Type is not supported
          continue;
        }

        values.push(
          { is_gap: segmentIsGap, x: start + segmentOffset, y: startY },
          { is_gap: segmentIsGap, x: start + nextSegmentOffset, y: endY },
        );
      }

      resources.push({ name, schema, values });
    }
  }

  return resources;
}
