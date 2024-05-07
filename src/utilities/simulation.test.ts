import { describe, expect, test } from 'vitest';
import type { RawSimulationEvent } from '../types/simulation';
import { compareEvents } from './simulation';

// Helper function to make events for testing
function ev(start_offset: string, transaction_index: number, dense_time: string): RawSimulationEvent {
  // topic_index and value are not relevant for sorting
  return {
    causal_time: dense_time,
    real_time: start_offset,
    topic_index: 1,
    transaction_index,
    value: {},
  };
}

describe('compareEvents', () => {
  test('Should return 0 for equal events', () => {
    expect(compareEvents(ev('01:02:03', 4, '.5.6'), ev('01:02:03', 4, '.5.6'))).toStrictEqual(0);
  });
  test('Should order events by start offset', () => {
    expect(compareEvents(ev('00:00:01', 1, '.1'), ev('00:00:02', 0, '.0'))).toBeLessThan(0);
    expect(compareEvents(ev('00:00:02', 0, '.0'), ev('00:00:01', 1, '.1'))).toBeGreaterThan(0);
  });
  test('Should order events by transaction index if start offset is equal', () => {
    expect(compareEvents(ev('00:01:00', 1, '.1'), ev('00:01:00', 0, '.0'))).toBeGreaterThan(0);
    expect(compareEvents(ev('00:01:00', 0, '.0'), ev('00:01:00', 1, '.1'))).toBeLessThan(0);
  });
  test('Should order events by dense time if all else is equal', () => {
    expect(compareEvents(ev('00:01:00', 4, '.1'), ev('00:01:00', 4, '.0'))).toBeGreaterThan(0);
    expect(compareEvents(ev('00:01:00', 4, '.0'), ev('00:01:00', 4, '.1'))).toBeLessThan(0);
    expect(compareEvents(ev('00:01:00', 4, '.0.1.1'), ev('00:01:00', 4, '.0.1.2'))).toBeLessThan(0);
  });
  test('Should return 0 for concurrent events', () => {
    expect(compareEvents(ev('00:01:00', 4, '.0.1'), ev('00:01:00', 4, '.0.2'))).toStrictEqual(0);
    expect(compareEvents(ev('00:01:00', 4, '.0.1.1.2'), ev('00:01:00', 4, '.0.1.1.1'))).toStrictEqual(0);
  });
});
