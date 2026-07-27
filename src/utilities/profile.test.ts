import { describe, expect, test } from 'vitest';
import { pickEffectiveDuration } from './profile';

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
