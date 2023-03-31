import type { Profile, Resource, ResourceValue } from '../types/simulation';
import { getIntervalInMs } from './time';

/**
 * Samples a list of profiles at their change points. Converts the sampled profiles to Resources.
 */
export function sampleProfiles(
  profiles: Profile[] | null,
  startTimeYmd: string | null,
  durationInterval: string | null,
  offsetInterval?: string,
): Resource[] {
  const resources: Resource[] = [];

  if (profiles && startTimeYmd && durationInterval) {
    const offsetMs = getIntervalInMs(offsetInterval);
    const start = new Date(startTimeYmd).getTime() + offsetMs;
    const duration = getIntervalInMs(durationInterval);

    for (const profile of profiles) {
      const { name, profile_segments, type: profileType } = profile;
      const { schema, type } = profileType;
      const values: ResourceValue[] = [];

      for (let i = 0; i < profile_segments.length; ++i) {
        const segment = profile_segments[i];
        const nextSegment = profile_segments[i + 1];

        const segmentOffset = getIntervalInMs(segment.start_offset);
        const nextSegmentOffset = nextSegment ? getIntervalInMs(nextSegment.start_offset) : duration;

        const { dynamics } = segment;

        if (type === 'discrete') {
          values.push({
            x: start + segmentOffset,
            y: dynamics,
          });
          values.push({
            x: start + nextSegmentOffset,
            y: dynamics,
          });
        } else if (type === 'real') {
          values.push({
            x: start + segmentOffset,
            y: dynamics.initial,
          });
          values.push({
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
