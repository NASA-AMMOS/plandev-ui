type GqlSubscribable<T> = {
  setVariables: (newVariables: QueryVariables) => void;
  subscribe: (next: import('svelte/store').Subscriber<T>) => Unsubscriber;
  filterValueById(id: number): void;
  updateValue(fn: Updater<T>): void;
};

type NextValue<T> = { [key: string]: T };

type QueryVariables = Record<string, any>;

type Subscription<T> = {
  next: import('svelte/store').Subscriber<T>;
  unsubscribe: import('svelte/store').Unsubscriber;
};
