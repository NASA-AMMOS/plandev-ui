import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

export type SubscriptionManagerRecord = {
  error: string;
  loading: boolean;
  query?: string; // Optional, for debugging
  restart: () => void;
};

/**
 * SSR Safety: This module-level store is safe because subscriptions
 * only register in browser context (gqlSubscribable checks `if (browser)`).
 * The store is never populated during server-side rendering.
 */
export const subscriptionManager: Writable<Record<string, SubscriptionManagerRecord>> = writable({});

export const subscriptionsLoading: Readable<boolean> = derived(
  [subscriptionManager],
  ([$subscriptionManager]) =>
    !!Object.values($subscriptionManager).find(subscription => subscription.loading && !subscription.error),
  true,
);

export function addSubscription(id: string, entry: SubscriptionManagerRecord) {
  subscriptionManager.set({ ...get(subscriptionManager), [id]: entry });
}

export function updateSubscription(id: string, entry: Partial<SubscriptionManagerRecord>) {
  const current = get(subscriptionManager);
  if (current[id]) {
    subscriptionManager.set({ ...current, [id]: { ...current[id], ...entry } });
  }
}

export function removeSubscription(id: string) {
  const { [id]: _, ...rest } = get(subscriptionManager);
  subscriptionManager.set(rest);
}

/**
 * Restarts all subscriptions by calling each subscription's restart function.
 * Each restart() call triggers restartSharedClient() which is debounced,
 * so the shared WebSocket only restarts once even with many subscriptions.
 */
export function restartSubscriptions() {
  Object.values(get(subscriptionManager)).forEach(({ restart }) => restart());
}
