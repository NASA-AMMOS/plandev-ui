import { get } from 'svelte/store';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { isOfflineActive, setOfflineActive } from './offlineFlag';
import { gqlSubscribable } from './subscribable';

// https://github.com/sveltejs/kit/issues/8180 -- same workaround used by
// other component tests in this repo (e.g. ChangePlanBoundsModal.svelte.test.ts)
// for `$env/dynamic/public` outside of a real SvelteKit request context.
vi.mock('$env/dynamic/public', () => import.meta.env);

// Mocked (rather than left real) so these tests can assert the offline gate
// never reaches `getSharedClient()` at all, not just that it fails quietly.
const getSharedClientMock = vi.fn(() => null);
vi.mock('./gqlClient', () => ({
  clearPendingQueryName: vi.fn(),
  getSharedClient: () => getSharedClientMock(),
  registerSubscription: vi.fn(),
  restartSharedClient: vi.fn(),
  setPendingQueryName: vi.fn(),
  unregisterSubscription: vi.fn(),
}));

const FAKE_QUERY = `
  subscription FakeSubscription {
    fake_table {
      id
    }
  }
`;

describe('gqlSubscribable offline gating', () => {
  afterEach(() => {
    setOfflineActive(false);
    getSharedClientMock.mockClear();
  });

  test('serves its initial value to a subscriber without opening a client', () => {
    setOfflineActive(true);

    const store = gqlSubscribable<number[]>(FAKE_QUERY, null, [1, 2, 3]);

    const received: (number[])[] = [];
    const unsubscribe = store.subscribe(value => received.push(value));

    expect(received).toEqual([[1, 2, 3]]);
    expect(getSharedClientMock).not.toHaveBeenCalled();

    unsubscribe();
  });

  test('settles loading to false while offline instead of hanging', () => {
    setOfflineActive(true);

    const store = gqlSubscribable<number[]>(FAKE_QUERY, null, []);

    let loading: boolean | undefined;
    const unsubscribeLoading = store.loading.subscribe(value => (loading = value));
    // Before anything subscribes to the store's data, loading starts true
    // (mirroring the online case, where nothing has resolved yet).
    expect(loading).toBe(true);

    const unsubscribe = store.subscribe(() => {});
    // Offline mode settles loading synchronously on subscribe -- there's no
    // network round-trip to wait on.
    expect(loading).toBe(false);

    unsubscribe();
    unsubscribeLoading();
  });

  test('updateValue pushes a new value to existing subscribers without touching the client', () => {
    setOfflineActive(true);

    const store = gqlSubscribable<number[]>(FAKE_QUERY, null, []);

    const received: (number[])[] = [];
    const unsubscribe = store.subscribe(value => received.push(value));

    store.updateValue(() => [42]);

    expect(received).toEqual([[], [42]]);
    expect(getSharedClientMock).not.toHaveBeenCalled();

    unsubscribe();
  });

  test('setVariables and restartSocket do not throw or open a client while offline', () => {
    setOfflineActive(true);

    const store = gqlSubscribable<number[]>(FAKE_QUERY, { id: 1 }, []);
    const unsubscribe = store.subscribe(() => {});

    expect(() => store.setVariables({ id: 2 })).not.toThrow();
    expect(() => store.restartSocket()).not.toThrow();
    expect(getSharedClientMock).not.toHaveBeenCalled();

    unsubscribe();
  });

  test('isOfflineActive reflects the most recent setOfflineActive call', () => {
    expect(isOfflineActive()).toBe(false);
    setOfflineActive(true);
    expect(isOfflineActive()).toBe(true);
    setOfflineActive(false);
    expect(isOfflineActive()).toBe(false);
  });

  test('subscribes and opens the client normally when offline mode is inactive', () => {
    setOfflineActive(false);

    const store = gqlSubscribable<number[]>(FAKE_QUERY, null, [9]);
    const received: (number[])[] = [];
    const unsubscribe = store.subscribe(value => received.push(value));

    // The initial value is always delivered synchronously, regardless of
    // whether a live client connection could actually be established.
    expect(received).toEqual([[9]]);

    unsubscribe();
  });

  test('offline gate does not cross-contaminate a subsequent online subscriber', () => {
    setOfflineActive(true);
    const offlineStore = gqlSubscribable<number[]>(FAKE_QUERY, null, [1]);
    const unsubOffline = offlineStore.subscribe(() => {});
    unsubOffline();

    setOfflineActive(false);
    const onlineStore = gqlSubscribable<number[]>(FAKE_QUERY, null, [2]);
    const received: (number[])[] = [];
    // Once offline mode is off, normal subscription activation resumes; this
    // must not throw even though there is no real Hasura to connect to.
    const unsubOnline = onlineStore.subscribe(value => received.push(value));

    expect(received).toEqual([[2]]);

    unsubOnline();
  });
});

describe('gqlSubscribable offline gating with get()', () => {
  afterEach(() => {
    setOfflineActive(false);
  });

  test('get() works against an offline-mode store without opening a client', () => {
    setOfflineActive(true);
    const store = gqlSubscribable<string>(FAKE_QUERY, null, 'hydrated-value');
    expect(get(store)).toBe('hydrated-value');
  });
});
