import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

export type SubscriptionManagerRecord = { error: string; loading: boolean; restart: () => void };

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
  const newSubscriptionManager = get(subscriptionManager);
  delete newSubscriptionManager[id];
  subscriptionManager.set(newSubscriptionManager);
}

export function restartSubscriptions() {
  Object.values(get(subscriptionManager)).map(({ restart }) => restart());
}
