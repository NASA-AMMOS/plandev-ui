import { writable, type Writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Profile, Resource, SimulationDataset } from '../types/simulation';

const getProfileSinceMock = vi.fn();
vi.mock('../utilities/effects', () => ({
  default: {
    getProfileSince: (...args: any[]) => getProfileSinceMock(...args),
  },
}));

const simulationDatasetMock: Writable<SimulationDataset | null> = writable(null);
vi.mock('./simulation', () => ({
  simulationDataset: simulationDatasetMock,
}));

// Stub: `./errors` transitively pulls `$env/dynamic/public` via requests.ts.
vi.mock('./errors', () => ({
  catchError: vi.fn(),
  logMessage: vi.fn(),
}));

function setSimRunning(datasetId: number, extent: string = '00:00:00') {
  simulationDatasetMock.set({
    canceled: false,
    dataset_id: datasetId,
    extent: { extent },
    status: 'incomplete',
  } as SimulationDataset);
}
function setSimComplete(datasetId: number, extent: string = '00:10:00') {
  simulationDatasetMock.set({
    canceled: false,
    dataset_id: datasetId,
    extent: { extent },
    status: 'success',
  } as SimulationDataset);
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

async function flushPromises() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('createProfileSubscription', () => {
  let createProfileSubscription: typeof import('./profile').createProfileSubscription;
  // Track subs so afterEach cleanup runs even if a test fails before its
  // inline unsubscribe — a leaked sub would steal mockResolvedValueOnce
  // slots from the next test.
  let activeSubs: Array<{ unsubscribe: () => void }> = [];
  function makeSub(...args: Parameters<typeof createProfileSubscription>) {
    const sub = createProfileSubscription(...args);
    activeSubs.push(sub);
    return sub;
  }

  beforeEach(async () => {
    getProfileSinceMock.mockReset();
    simulationDatasetMock.set(null);
    // `simulationDatasetMock` is module-scoped (top of file) so it survives
    // resetModules — both the prior import and the fresh import below see
    // the same writable. The fresh import is what we resubscribe against
    // for each test.
    vi.resetModules();
    const mod = await import('./profile');
    createProfileSubscription = mod.createProfileSubscription;
  });

  afterEach(() => {
    activeSubs.forEach(s => s.unsubscribe());
    activeSubs = [];
    getProfileSinceMock.mockReset();
  });

  test('first refetch with full data emits a Resource and clears loading', async () => {
    const profile = makeProfile({
      duration: '00:02:00',
      segments: [{ start_offset: '00:00:00', value: 'A' }],
    });
    getProfileSinceMock.mockResolvedValue(profile);
    setSimComplete(1);

    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    expect(last.loading).toBe(false);
    expect(last.error).toBe('');
    expect(last.resource).not.toBeNull();
    sub.unsubscribe();
  });

  test('null response keeps loading true; subsequent tick refetches and resolves', async () => {
    getProfileSinceMock.mockResolvedValueOnce(null);
    setSimRunning(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    expect(last.loading).toBe(true);
    expect(last.resource).toBeNull();

    getProfileSinceMock.mockResolvedValueOnce(
      makeProfile({ duration: '00:10:00', segments: [{ start_offset: '00:00:00', value: 'A' }] }),
    );
    setSimRunning(1, '00:00:30');
    await flushPromises();

    expect(last.loading).toBe(false);
    expect(last.resource).not.toBeNull();
    sub.unsubscribe();
  });

  test('subsequent refetch passes the last seen start_offset as sinceOffset', async () => {
    getProfileSinceMock.mockResolvedValueOnce(
      makeProfile({
        duration: '00:10:00',
        segments: [
          { start_offset: '00:00:00', value: 'A' },
          { start_offset: '00:01:00', value: 'B' },
        ],
      }),
    );
    setSimRunning(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    sub.store.subscribe(() => {});
    await flushPromises();

    expect(getProfileSinceMock.mock.calls[0][2]).toBe('-00:00:01');

    getProfileSinceMock.mockResolvedValueOnce(
      makeProfile({ duration: '00:10:00', segments: [{ start_offset: '00:02:00', value: 'C' }] }),
    );
    setSimRunning(1, '00:02:00');
    await flushPromises();

    expect(getProfileSinceMock.mock.calls[1][2]).toBe('00:01:00');
    sub.unsubscribe();
  });

  test('sim flips terminal: closing value swaps from lastOffset to header.duration', async () => {
    getProfileSinceMock.mockResolvedValueOnce(
      makeProfile({ duration: '00:10:00', segments: [{ start_offset: '00:01:00', value: 'A' }] }),
    );
    setSimRunning(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    const startMs = new Date('2024-01-01T00:00:00').getTime();
    let values = (last.resource as Resource).values;
    // Streaming: closing at last segment offset (1m).
    expect(values[values.length - 1].x).toBe(startMs + 60000);

    getProfileSinceMock.mockResolvedValueOnce(makeProfile({ duration: '00:10:00', segments: [] }));
    setSimComplete(1);
    await flushPromises();

    values = (last.resource as Resource).values;
    // Terminal: closing at header.duration (10m).
    expect(values[values.length - 1].x).toBe(startMs + 600000);
    sub.unsubscribe();
  });

  // Regression: terminal sim + null profile must clear loading (no ticks
  // will fire to retry) and surface a not-found error rather than silently
  // rendering a blank row.
  test('terminal sim with null profile surfaces a not-found error instead of getting stuck', async () => {
    getProfileSinceMock.mockResolvedValue(null);
    setSimComplete(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    expect(last.loading).toBe(false);
    expect(last.error).toBe('Resource not found in simulation dataset');
    expect(last.resource).toBeNull();
  });

  test('refetch error surfaces in state', async () => {
    getProfileSinceMock.mockRejectedValue(new Error('boom'));
    setSimRunning(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    let last: any;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    expect(last.error).toBe('boom');
    expect(last.loading).toBe(false);
    sub.unsubscribe();
  });

  test('refetch error propagates to the global timelineResourcesErroring registry', async () => {
    const { timelineResourcesErroring } = await import('./timelineResourceStatus');
    getProfileSinceMock.mockRejectedValue(new Error('boom'));
    setSimRunning(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);
    let lastErrors: any[] = [];
    const unsub = timelineResourcesErroring.subscribe(errs => {
      lastErrors = errs;
    });
    await flushPromises();

    expect(lastErrors).toHaveLength(1);
    expect(lastErrors[0]).toMatchObject({ datasetId: 1, error: 'boom', name: 'r' });
    unsub();
    sub.unsubscribe();
  });

  test('dispose during in-flight refetch: no state mutations after unsubscribe', async () => {
    let resolveFetch: (v: Profile | null) => void = () => {};
    getProfileSinceMock.mockReturnValue(new Promise<Profile | null>(r => (resolveFetch = r)));
    setSimRunning(1);
    const sub = makeSub(1, 'r', '2024-01-01T00:00:00', null);

    let updates = 0;
    sub.store.subscribe(() => {
      updates++;
    });
    const baseline = updates;

    sub.unsubscribe();
    resolveFetch(makeProfile({ duration: '00:10:00', segments: [{ start_offset: '00:00:00', value: 'A' }] }));
    await flushPromises();

    expect(updates).toBe(baseline);
  });
});
