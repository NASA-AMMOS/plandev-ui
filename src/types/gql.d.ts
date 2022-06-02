type GqlSubscribable<T> = {
  filterValueById(id: number): void;
  setVariables: (newVariables: QueryVariables) => void;
  subscribe: (next: import('svelte/store').Subscriber<T>) => Unsubscriber;
  updateValue(fn: Updater<T>): void;
};

type NextValue<T> = { [key: string]: T };

type QueryVariables = Record<string, unknown>;

type Subscription<T> = {
  next: import('svelte/store').Subscriber<T>;
  unsubscribe: import('svelte/store').Unsubscriber;
};
