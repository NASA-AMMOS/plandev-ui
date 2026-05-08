import { describe, expect, test } from 'vitest';
import type { ProfileSegment } from '../types/simulation';
import { dedupNewSegments, pickEffectiveDuration } from './profile';

function seg(start_offset: string): ProfileSegment {
  return { dataset_id: 1, dynamics: null, is_gap: false, profile_id: 1, start_offset };
}

describe('dedupNewSegments', () => {
  test('returns the full delta when accumulator is empty', () => {
    const delta = [seg('00:00:00'), seg('00:01:00')];
    expect(dedupNewSegments([], delta)).toEqual(delta);
  });

  test('skips segments at or before the accumulator max offset', () => {
    // Reconnect-replay: server resends the prefetched 0s and the already-
    // streamed 1m and 2m, then a genuinely-new 3m.
    const accumulator = [seg('00:00:00'), seg('00:01:00'), seg('00:02:00')];
    const replay = [seg('00:00:00'), seg('00:01:00'), seg('00:02:00'), seg('00:03:00')];
    expect(dedupNewSegments(accumulator, replay)).toEqual([seg('00:03:00')]);
  });

  test('returns [] when the entire delta is a duplicate', () => {
    const accumulator = [seg('00:00:00'), seg('00:01:00')];
    expect(dedupNewSegments(accumulator, [seg('00:00:00'), seg('00:01:00')])).toEqual([]);
  });

  test('drops duplicates within a single delta after one passes through', () => {
    // A delta containing the same offset twice should only produce one push.
    expect(dedupNewSegments([], [seg('00:00:00'), seg('00:00:00')])).toEqual([seg('00:00:00')]);
  });
});

describe('pickEffectiveDuration', () => {
  test('returns headerDuration when there are no segments yet', () => {
    expect(pickEffectiveDuration('00:10:00', null, true)).toBe('00:10:00');
    expect(pickEffectiveDuration('00:10:00', null, false)).toBe('00:10:00');
  });

  test('while streaming, returns the last segment offset (no extrapolation)', () => {
    // header.duration may be plan duration upfront or running extent — both
    // would extend past actually-received data. We terminate at last offset.
    expect(pickEffectiveDuration('05:00:00', '00:01:00', true)).toBe('00:01:00');
  });

  test('once streaming stops, returns headerDuration when it is >= lastOffset', () => {
    expect(pickEffectiveDuration('00:10:00', '00:01:00', false)).toBe('00:10:00');
  });

  test('once streaming stops, falls back to lastOffset when headerDuration is shorter', () => {
    // Defensive: if backend somehow has a stale/short duration but we have
    // a segment at a later offset, the segment offset wins so the values
    // array stays sorted.
    expect(pickEffectiveDuration('00:00:30', '00:01:00', false)).toBe('00:01:00');
  });
});
