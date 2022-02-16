type NextValue<T> = { [key: string]: T };

type QueryVariables = Record<string, unknown>;

type Subscription<T> = {
  next: import('svelte/store').Subscriber<T>;
  unsubscribe: import('svelte/store').Unsubscriber;
};
