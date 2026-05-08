import type { ProfileSegment } from '../types/simulation';
import { getIntervalInMs } from '../utilities/time';

/**
 * Returns only the segments in `delta` whose start_offset is strictly past the
 * last offset already in `accumulator`. graphql-ws reconnects re-run the
 * streaming subscription with the original cursor, so the server replays
 * everything past that cursor — including segments we already appended pre-
 * disconnect. Filtering here keeps the values array sorted.
 */
export function dedupNewSegments(accumulator: ProfileSegment[], delta: ProfileSegment[]): ProfileSegment[] {
  let lastMs = accumulator.length > 0 ? getIntervalInMs(accumulator[accumulator.length - 1].start_offset) : -Infinity;
  const result: ProfileSegment[] = [];
  for (const seg of delta) {
    const segMs = getIntervalInMs(seg.start_offset);
    if (segMs > lastMs) {
      result.push(seg);
      lastMs = segMs;
    }
  }
  return result;
}

/**
 * Picks the duration sampleProfiles should use to place the closing value of
 * the final segment. While the sim is streaming the last received segment is
 * the data frontier (extending past it would draw a flat line of stale value
 * out to a fictional end). Once the sim is terminal, header.duration is
 * authoritative — but if the backend's value is stale and shorter than the
 * last segment we've actually received, the segment offset wins so the values
 * array stays sorted.
 */
export function pickEffectiveDuration(
  headerDuration: string,
  lastSegmentStartOffset: string | null,
  streamingActive: boolean,
): string {
  if (lastSegmentStartOffset === null) {
    return headerDuration;
  }
  if (streamingActive) {
    return lastSegmentStartOffset;
  }
  return getIntervalInMs(headerDuration) >= getIntervalInMs(lastSegmentStartOffset)
    ? headerDuration
    : lastSegmentStartOffset;
}
