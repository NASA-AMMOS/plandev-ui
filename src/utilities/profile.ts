import { getIntervalInMs } from './time';

/**
 * Picks the duration sampleProfiles uses to place the closing value of the
 * final segment. While streaming, the last received segment is the data
 * frontier. Once terminal, header.duration wins — unless a stale/short
 * header would land before the last received segment offset, in which case
 * we fall back to the offset to keep values sorted.
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
  // Defend against malformed input: getIntervalInMs returns 0 for unparseable
  // strings, which would silently pick a too-short header and produce an
  // unsorted values array (pinned by sort-invariant regression test in
  // resources.test.ts).
  const headerMs = getIntervalInMs(headerDuration);
  const offsetMs = getIntervalInMs(lastSegmentStartOffset);
  if (!Number.isFinite(headerMs) || !Number.isFinite(offsetMs)) {
    return lastSegmentStartOffset;
  }
  return headerMs >= offsetMs ? headerDuration : lastSegmentStartOffset;
}
