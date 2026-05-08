import { writable, type Writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Profile, ProfileSegment, Resource, SimulationDataset } from '../types/simulation';

// Integration tests for createProfileSubscription's state machine. The pure
// helpers (dedupNewSegments, pickEffectiveDuration) live in utilities/profile
// and are tested there in isolation. These tests cover the COORDINATION bugs
// — what happens when prefetch / waitForProfile / streaming-sub / sim-status
// interleave in adversarial ways. The resimulate-fast scenario is the one
// that bit us in production; the dispose test is the standard "no leaks"
// guard; the sim-flip test pins the closing-value swap.

type MockSub<T> = {
  emit: (raw: any) => void;
  error: { subscribe: (cb: (v: string) => void) => () => void };
  loading: { subscribe: (cb: (v: boolean) => void) => () => void };
  query: string;
  setError: (e: string) => void;
  setLoading: (l: boolean) => void;
  subscribe: (cb: (v: T) => void) => () => void;
};

const subInstances: MockSub<any>[] = [];

vi.mock('./subscribable', () => ({
  gqlSubscribable: vi.fn((query: string, _vars: any, initial: any, transformer?: (raw: any) => any) => {
    let value = initial;
    let loading = true;
    let error = '';
    const subs = new Set<(v: any) => void>();
    const loadingSubs = new Set<(v: boolean) => void>();
    const errorSubs = new Set<(v: string) => void>();
    const instance: MockSub<any> = {
      emit: raw => {
        value = transformer ? transformer(raw) : raw;
        subs.forEach(s => s(value));
      },
      error: {
        subscribe: cb => {
          errorSubs.add(cb);
          cb(error);
          return () => errorSubs.delete(cb);
        },
      },
      loading: {
        subscribe: cb => {
          loadingSubs.add(cb);
          cb(loading);
          return () => loadingSubs.delete(cb);
        },
      },
      query,
      setError: e => {
        error = e;
        errorSubs.forEach(s => s(e));
      },
      setLoading: l => {
        loading = l;
        loadingSubs.forEach(s => s(l));
      },
      subscribe: cb => {
        subs.add(cb);
        cb(value);
        return () => subs.delete(cb);
      },
    };
    subInstances.push(instance);
    return instance;
  }),
}));

const getProfileMock = vi.fn();
vi.mock('../utilities/effects', () => ({
  default: {
    getProfile: (...args: any[]) => getProfileMock(...args),
  },
}));

const simulationDatasetMock: Writable<SimulationDataset | null> = writable(null);
vi.mock('./simulation', () => ({
  simulationDataset: simulationDatasetMock,
}));

function setSimRunning(datasetId: number) {
  simulationDatasetMock.set({ canceled: false, dataset_id: datasetId, status: 'incomplete' } as SimulationDataset);
}
function setSimComplete(datasetId: number) {
  simulationDatasetMock.set({ canceled: false, dataset_id: datasetId, status: 'success' } as SimulationDataset);
}

function makeProfile(opts: { duration: string; segments: Array<{ start_offset: string; value: any }> }): Profile {
  return {
    dataset_id: 1,
    duration: opts.duration,
    id: 7,
    name: 'r',
    profile_segments: opts.segments.map(s => ({
      dataset_id: 1,
      dynamics: s.value,
      is_gap: false,
      profile_id: 7,
      start_offset: s.start_offset,
    })),
    type: { schema: { type: 'string' } as any, type: 'discrete' },
  };
}

function findSubByQuery(matcher: string): MockSub<any> | undefined {
  return subInstances.find(s => s.query.includes(matcher));
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('createProfileSubscription', () => {
  let createProfileSubscription: typeof import('./profile').createProfileSubscription;

  beforeEach(async () => {
    subInstances.length = 0;
    getProfileMock.mockReset();
    simulationDatasetMock.set(null);
    vi.resetModules();
    const mod = await import('./profile');
    createProfileSubscription = mod.createProfileSubscription;
  });

  afterEach(() => {
    subInstances.length = 0;
  });

  // Regression test for the resimulate-on-fast-model bug: prefetch ran before
  // the profile row existed, the live header sub delivered the row only after
  // the sim had already terminated, and the streaming sub never opened — so
  // accumulator stayed empty and the plot rendered nothing.
  test('resimulate-fast: prefetch null + sim terminal at header-arrival opens stream for backfill', async () => {
    getProfileMock.mockResolvedValue(null);
    setSimRunning(1);
    const sub = createProfileSubscription(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    // Prefetch returned null → live header sub is open, no streaming sub yet.
    expect(findSubByQuery('SubProfileHeader')).toBeDefined();
    expect(findSubByQuery('SubProfileSegmentsStream')).toBeUndefined();

    // Sim races to completion before header sub fires.
    setSimComplete(1);
    await flushPromises();

    // Header sub eventually fires with the profile row.
    const headerSub = findSubByQuery('SubProfileHeader')!;
    headerSub.emit([{ dataset_id: 1, duration: '00:10:00', id: 7, name: 'r', type: { schema: {}, type: 'discrete' } }]);
    await flushPromises();

    // Even though sim is now terminal, the streaming sub MUST open to backfill
    // segments — header sub doesn't carry segment columns and prefetch already
    // returned null.
    const streamSub = findSubByQuery('SubProfileSegmentsStream');
    expect(streamSub).toBeDefined();

    // Stream delivers existing segments (server returns rows past initial cursor
    // regardless of sim status).
    streamSub!.emit([
      { dataset_id: 1, dynamics: 'A', is_gap: false, profile_id: 7, start_offset: '00:00:00' },
      { dataset_id: 1, dynamics: 'B', is_gap: false, profile_id: 7, start_offset: '00:01:00' },
    ] as ProfileSegment[]);
    streamSub!.setLoading(false);
    await flushPromises();

    expect(last.resource).not.toBeNull();
    expect((last.resource as Resource).values.length).toBeGreaterThan(0);
    expect(last.loading).toBe(false);

    sub.unsubscribe();
  });

  test('sim flips terminal mid-stream: closing value swaps from lastOffset to header.duration', async () => {
    const profile = makeProfile({
      duration: '00:10:00',
      segments: [{ start_offset: '00:00:00', value: 'A' }],
    });
    getProfileMock.mockResolvedValue(profile);
    setSimRunning(1);
    const sub = createProfileSubscription(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    const streamSub = findSubByQuery('SubProfileSegmentsStream')!;
    streamSub.emit([
      { dataset_id: 1, dynamics: 'B', is_gap: false, profile_id: 7, start_offset: '00:01:00' },
    ] as ProfileSegment[]);
    streamSub.setLoading(false);
    await flushPromises();

    const startMs = new Date('2024-01-01T00:00:00').getTime();
    let values = (last.resource as Resource).values;
    // Streaming → closing at last segment offset (1m).
    expect(values[values.length - 1].x).toBe(startMs + 60000);

    setSimComplete(1);
    await flushPromises();

    values = (last.resource as Resource).values;
    // Terminal → closing at header.duration (10m).
    expect(values[values.length - 1].x).toBe(startMs + 600000);

    sub.unsubscribe();
  });

  test('dispose during pending prefetch: no state mutations after unsubscribe', async () => {
    let resolvePrefetch: (v: Profile | null) => void = () => {};
    getProfileMock.mockReturnValue(new Promise<Profile | null>(r => (resolvePrefetch = r)));
    setSimRunning(1);
    const sub = createProfileSubscription(1, 'r', '2024-01-01T00:00:00', null);

    let updatesAfterUnsubscribe = 0;
    sub.store.subscribe(() => {
      updatesAfterUnsubscribe++;
    });
    const baseline = updatesAfterUnsubscribe;

    sub.unsubscribe();
    resolvePrefetch(makeProfile({ duration: '00:10:00', segments: [{ start_offset: '00:00:00', value: 'A' }] }));
    await flushPromises();

    // No store update fired post-unsubscribe.
    expect(updatesAfterUnsubscribe).toBe(baseline);
    // No streaming sub was opened either.
    expect(findSubByQuery('SubProfileSegmentsStream')).toBeUndefined();
  });
});
