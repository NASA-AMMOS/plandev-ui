import type { Readable, Subscriber, Unsubscriber, Updater } from 'svelte/store';

export type GqlSubscribable<T> = {
  /** Readable store for the subscription's error state (empty string if no error) */
  error: Readable<string>;
  loading: Readable<boolean>;
  setVariables: (newVariables: QueryVariables) => void;
  subscribe: (next: Subscriber<T>) => Unsubscriber;
  filterValueById(id: number): void;
  /**
   * Force the active subscription to re-pull fresh data from the server (no-op if nothing is
   * currently subscribed). Useful after a mutation whose effects are applied server-side (e.g. a
   * Postgres trigger) and may not always be surfaced by the live subscription immediately.
   */
  refetch(): void;
  /** Readable store for the subscription's loading state */
  restartSocket(): void;
  updateValue(fn: Updater<T>): void;
};

export type NextValue<T> = { [key: string]: T };

export type QueryVariables = Record<string, any>;

export type Subscription<T> = {
  next: Subscriber<T>;
};
