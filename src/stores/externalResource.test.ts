import { writable, type Subscriber, type Writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PlanDataset, Profile, ProfileSegment, Resource } from '../types/simulation';

const getExternalProfileSegmentsSinceMock = vi.fn();
vi.mock('../utilities/effects', () => ({
  default: {
    getExternalProfileSegmentsSince: (...args: any[]) => getExternalProfileSegmentsSinceMock(...args),
  },
}));

// A planDatasets mock that mimics the gqlSubscribable shape used by the
// factory: a primary store + a `.loading` substore. We can't import the real
// gqlSubscribable here because it pulls in `$env/dynamic/public` via the
// shared WebSocket client, which Vitest can't satisfy.
type PlanDatasetsMock = {
  _setLoading: (v: boolean) => void;
  loading: { subscribe: (s: Subscriber<boolean>) => () => void };
  set: (v: PlanDataset[]) => void;
  subscribe: (s: Subscriber<PlanDataset[]>) => () => void;
};

const planDatasetsValue: Writable<PlanDataset[]> = writable([]);
const planDatasetsLoading: Writable<boolean> = writable(true);
const planDatasetsMock: PlanDatasetsMock = {
  _setLoading: v => planDatasetsLoading.set(v),
  loading: { subscribe: planDatasetsLoading.subscribe },
  set: v => planDatasetsValue.set(v),
  subscribe: planDatasetsValue.subscribe,
};
vi.mock('./plan', () => ({
  planDatasets: planDatasetsMock,
}));

vi.mock('./errors', () => ({
  catchError: vi.fn(),
  logMessage: vi.fn(),
}));

function makeProfile(opts: { duration: string; id: number; name: string }): Profile {
  return {
    dataset_id: 0,
    duration: opts.duration,
    id: opts.id,
    name: opts.name,
    profile_segments: [],
    type: { schema: { type: 'string' } as any, type: 'discrete' },
  };
}

function makePlanDataset(opts: {
  datasetId: number;
  offset?: string;
  profiles: Profile[];
  simDatasetId?: number | null;
}): PlanDataset {
  return {
    dataset: { profiles: opts.profiles },
    dataset_id: opts.datasetId,
    offset_from_plan_start: opts.offset ?? '00:00:00',
    simulation_dataset_id: opts.simDatasetId ?? null,
  };
}

function segments(specs: Array<{ start_offset: string; value: any }>): ProfileSegment[] {
  return specs.map(s => ({
    dataset_id: 0,
    dynamics: s.value,
    is_gap: false,
    profile_id: 0,
    start_offset: s.start_offset,
  }));
}

async function flushPromises() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('createExternalResourceSubscription', () => {
  let createExternalResourceSubscription: typeof import('./externalResource').createExternalResourceSubscription;
  // Track subs across the test so afterEach can clean up even if a test
  // fails before its inline unsubscribe — a leaked sub would steal mock
  // slots from the next test.
  let activeSubs: Array<{ unsubscribe: () => void }> = [];
  function makeSub(...args: Parameters<typeof createExternalResourceSubscription>) {
    const sub = createExternalResourceSubscription(...args);
    activeSubs.push(sub);
    return sub;
  }

  beforeEach(async () => {
    getExternalProfileSegmentsSinceMock.mockReset();
    planDatasetsValue.set([]);
    planDatasetsLoading.set(true);
    vi.resetModules();
    // Dynamic import so vi.resetModules() takes effect — the factory closes
    // over the mocked planDatasets/effects at import time.
    const mod = await import('./externalResource');
    createExternalResourceSubscription = mod.createExternalResourceSubscription;
  });

  afterEach(() => {
    activeSubs.forEach(s => s.unsubscribe());
    activeSubs = [];
    getExternalProfileSegmentsSinceMock.mockReset();
  });

  test('settling → found: first fetch resolves to a Resource', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValue(
      segments([
        { start_offset: '00:00:00', value: 'A' },
        { start_offset: '00:01:00', value: 'B' },
      ]),
    );

    // Sub created while planDatasets is still loading — must stay in
    // loading state and NOT flash an error.
    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    let last: any = null;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    expect(last.loading).toBe(true);
    expect(last.error).toBe('');

    // Subscription settles with a populated planDatasets that has the name.
    const profile = makeProfile({ duration: '00:02:00', id: 7, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    planDatasetsLoading.set(false);
    await flushPromises();

    expect(last.loading).toBe(false);
    expect(last.error).toBe('');
    expect(last.resource).not.toBeNull();
    expect((last.resource as Resource).values.length).toBeGreaterThan(0);
  });

  test('race-defer: settling → missing → found does NOT surface the missing error', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValue(segments([{ start_offset: '00:00:00', value: 'A' }]));

    const profile = makeProfile({ duration: '00:01:00', id: 9, name: 'r' });
    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    const seen: Array<{ error: string; loading: boolean }> = [];
    sub.store.subscribe(s => {
      seen.push({ error: s.error, loading: s.loading });
    });

    // The actual race: gqlSubscribable.next() flips `.loading` before the
    // value subscribers fire, so the derived briefly sees loading=false +
    // value=[]. Emulate that ordering: flip loading first (within the same
    // synchronous frame), then set the value. The microtask defer should
    // cancel the missing emit.
    planDatasetsLoading.set(false);
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    await flushPromises();

    expect(seen.every(s => s.error === '')).toBe(true);
  });

  test('settled missing → error fires after microtask', async () => {
    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    let last: any = null;
    sub.store.subscribe(s => {
      last = s;
    });

    // Settle with no matching profile and let the microtask run.
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [] })]);
    planDatasetsLoading.set(false);
    await flushPromises();

    expect(last.error).toBe('Resource not found in attached external datasets');
    expect(last.loading).toBe(false);
    expect(last.resource).toBeNull();
  });

  test('sim-tied plan_dataset row is preferred over plan-level (null sim) row', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValue(segments([{ start_offset: '00:00:00', value: 'A' }]));

    const profile = makeProfile({ duration: '00:02:00', id: 11, name: 'r' });
    planDatasetsValue.set([
      makePlanDataset({ datasetId: 1, profiles: [profile], simDatasetId: null }),
      makePlanDataset({ datasetId: 2, profiles: [profile], simDatasetId: 42 }),
    ]);
    planDatasetsLoading.set(false);

    const sub = makeSub(42, 'r', '2024-01-01T00:00:00', null);
    sub.store.subscribe(() => {});
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock).toHaveBeenCalled();
    const [firstCall] = getExternalProfileSegmentsSinceMock.mock.calls;
    expect(firstCall[0]).toBe(2); // datasetId from the sim-tied row, not the plan-level one
  });

  test('plan-level (null sim) row is preferred over a non-matching sim row', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValue(segments([{ start_offset: '00:00:00', value: 'A' }]));

    const profile = makeProfile({ duration: '00:02:00', id: 11, name: 'r' });
    planDatasetsValue.set([
      makePlanDataset({ datasetId: 3, profiles: [profile], simDatasetId: 99 }),
      makePlanDataset({ datasetId: 4, profiles: [profile], simDatasetId: null }),
    ]);
    planDatasetsLoading.set(false);

    // sub watches sim 42; neither row matches, so plan-level (datasetId=4) wins.
    const sub = makeSub(42, 'r', '2024-01-01T00:00:00', null);
    sub.store.subscribe(() => {});
    await flushPromises();

    const [firstCall] = getExternalProfileSegmentsSinceMock.mock.calls;
    expect(firstCall[0]).toBe(4);
  });

  test('duration advance triggers a refetch with the last seen offset as sinceOffset', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValueOnce(
      segments([
        { start_offset: '00:00:00', value: 'A' },
        { start_offset: '00:00:30', value: 'B' },
      ]),
    );

    const profile = makeProfile({ duration: '00:01:00', id: 11, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    planDatasetsLoading.set(false);

    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    sub.store.subscribe(() => {});
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock.mock.calls[0][2]).toBe('-00:00:01');

    // Duration grows (backend appended more segments). Trigger via a
    // metadata push with the new duration.
    getExternalProfileSegmentsSinceMock.mockResolvedValueOnce(segments([{ start_offset: '00:01:00', value: 'C' }]));
    planDatasetsValue.set([
      makePlanDataset({ datasetId: 1, profiles: [makeProfile({ duration: '00:02:00', id: 11, name: 'r' })] }),
    ]);
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock.mock.calls[1][2]).toBe('00:00:30');
  });

  test('unchanged metadata does NOT trigger a refetch', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValueOnce(segments([{ start_offset: '00:00:00', value: 'A' }]));

    const profile = makeProfile({ duration: '00:01:00', id: 11, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    planDatasetsLoading.set(false);

    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    sub.store.subscribe(() => {});
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock).toHaveBeenCalledTimes(1);

    // Re-emit identical metadata (same duration, same row). Should not
    // re-refetch — would otherwise hammer the backend on every metadata
    // tick during ingestion.
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock).toHaveBeenCalledTimes(1);
  });

  test('profile-row switch resets accumulator and refetches with sentinel offset', async () => {
    getExternalProfileSegmentsSinceMock.mockResolvedValueOnce(segments([{ start_offset: '00:00:30', value: 'A' }]));

    const profileA = makeProfile({ duration: '00:01:00', id: 11, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profileA] })]);
    planDatasetsLoading.set(false);

    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    sub.store.subscribe(() => {});
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock.mock.calls[0][2]).toBe('-00:00:01');

    // A different profile under the same name (different id and dataset)
    // wins on the next tick. Accumulator must reset and refetch with the
    // sentinel.
    getExternalProfileSegmentsSinceMock.mockResolvedValueOnce(segments([{ start_offset: '00:00:00', value: 'B' }]));
    const profileB = makeProfile({ duration: '00:01:00', id: 99, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 2, profiles: [profileB] })]);
    await flushPromises();

    expect(getExternalProfileSegmentsSinceMock.mock.calls[1][0]).toBe(2);
    expect(getExternalProfileSegmentsSinceMock.mock.calls[1][1]).toBe(99);
    expect(getExternalProfileSegmentsSinceMock.mock.calls[1][2]).toBe('-00:00:01');
  });

  test('refetch error surfaces in state', async () => {
    getExternalProfileSegmentsSinceMock.mockRejectedValue(new Error('boom'));

    const profile = makeProfile({ duration: '00:01:00', id: 11, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    planDatasetsLoading.set(false);

    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    let last: any = null;
    sub.store.subscribe(s => {
      last = s;
    });
    await flushPromises();

    expect(last.error).toBe('boom');
    expect(last.loading).toBe(false);
  });

  test('dispose during in-flight refetch: no state mutations after unsubscribe', async () => {
    let resolveFetch: (v: ProfileSegment[] | null) => void = () => {};
    getExternalProfileSegmentsSinceMock.mockReturnValue(new Promise<ProfileSegment[] | null>(r => (resolveFetch = r)));

    const profile = makeProfile({ duration: '00:01:00', id: 11, name: 'r' });
    planDatasetsValue.set([makePlanDataset({ datasetId: 1, profiles: [profile] })]);
    planDatasetsLoading.set(false);

    const sub = makeSub(-1, 'r', '2024-01-01T00:00:00', null);
    let updates = 0;
    sub.store.subscribe(() => {
      updates++;
    });
    const baseline = updates;

    sub.unsubscribe();
    resolveFetch(segments([{ start_offset: '00:00:00', value: 'A' }]));
    await flushPromises();

    expect(updates).toBe(baseline);
  });
});
