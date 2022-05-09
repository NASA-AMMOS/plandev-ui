type GqlSubscribable<T> = {
  setVariables: (newVariables: QueryVariables) => void;
  subscribe: (next: import('svelte/store').Subscriber<T>) => Unsubscriber;
};

type NextValue<T> = { [key: string]: T };

type QueryVariables = Record<string, unknown>;

type Subscription<T> = {
  next: import('svelte/store').Subscriber<T>;
  unsubscribe: import('svelte/store').Unsubscriber;
};
