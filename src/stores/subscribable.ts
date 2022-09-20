import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createClient, type Client, type ClientOptions } from 'graphql-ws';
import { isEqual } from 'lodash-es';
import { run_all } from 'svelte/internal';
import type { Readable, Subscriber, Unsubscriber, Updater } from 'svelte/store';

/**
 * Returns a Svelte store that listens to GraphQL subscriptions via graphql-ws.
 */
export function gqlSubscribable<T>(
  query: string,
  initialVariables: QueryVariables | null = null,
  initialValue: T | null = null,
  transformer: (v: any) => T = v => v,
): GqlSubscribable<T> {
  const subscribers: Set<Subscription<T>> = new Set();

  let client: Client | null;
  let value: T | null = initialValue;
  let variableUnsubscribers: Unsubscriber[] = [];
  let variables: QueryVariables | null = initialVariables;

  function clientSubscribe(): Unsubscriber {
    let unsubscribe: Unsubscriber = () => undefined;

    if (browser && client) {
      unsubscribe = client.subscribe<NextValue<T>>(
        {
          query,
          variables,
        },
        {
          complete: () => ({}),
          error: error => {
            console.log('subscribe error');
            console.log(error);
            subscribers.forEach(({ next }) => next(initialValue));
          },
          next: ({ data }) => {
            const [key] = Object.keys(data);
            const { [key]: newValue } = data;
            if (!isEqual(value, newValue)) {
              value = transformer(newValue);
              subscribers.forEach(({ next }) => next(value));
            }
          },
        },
      );
    }

    return unsubscribe;
  }

  function filterValueById(id: number): void {
    updateValue(currentValue => {
      if (Array.isArray(currentValue)) {
        return currentValue.filter(v => v?.id !== id) as unknown as T;
      }
      return currentValue;
    });
  }

  function resubscribe() {
    subscribers.forEach(subscriber => {
      subscriber.unsubscribe();
      const newUnsubscribe = clientSubscribe();
      subscriber.unsubscribe = newUnsubscribe;
    });
  }

  function setVariables(newVariables: QueryVariables): void {
    newVariables = { ...variables, ...newVariables };

    if (!isEqual(variables, newVariables)) {
      variables = newVariables;
      subscribeToVariables(variables);
      resubscribe();
    }
  }

  function subscribeToVariables(initialVariables: QueryVariables): void {
    run_all(variableUnsubscribers);
    variableUnsubscribers = [];

    for (const [name, variable] of Object.entries(initialVariables)) {
      if (typeof variable === 'object' && variable?.subscribe !== undefined) {
        const store = variable as Readable<any>;
        const unsubscriber = store.subscribe(value => {
          variables = { ...variables, [name]: value };
          resubscribe();
        });
        variableUnsubscribers.push(unsubscriber);
      }
    }
  }

  function subscribe(next: Subscriber<T>): Unsubscriber {
    if (browser && !client) {
      const clientOptions: ClientOptions = { url: env.PUBLIC_HASURA_WEB_SOCKET_URL };
      client = createClient(clientOptions);
      subscribeToVariables(initialVariables);
    }

    const unsubscribe = clientSubscribe();
    const subscriber: Subscription<T> = { next, unsubscribe };
    subscribers.add(subscriber);
    next(value);

    return () => {
      subscriber.unsubscribe();
      subscribers.delete(subscriber);

      if (subscribers.size === 0 && client) {
        run_all(variableUnsubscribers);
        variableUnsubscribers = [];
        client.dispose();
        client = null;
      }
    };
  }

  function updateValue(fn: Updater<T>): void {
    value = fn(value);
    subscribers.forEach(({ next }) => next(value));
  }

  return {
    filterValueById,
    setVariables,
    subscribe,
    updateValue,
  };
}
