import { browser } from '$app/env';
import { createClient, type Client, type ClientOptions } from 'graphql-ws';
import { isEqual } from 'lodash-es';
import { get, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store';
import { env as envStore } from '../stores/app';

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
    if (!isEqual(variables, newVariables)) {
      variables = newVariables;
      resubscribe();
    }
  }

  function subscribe(next: Subscriber<T>): Unsubscriber {
    if (browser && !client) {
      const { HASURA_WEB_SOCKET_URL: url } = get<Env>(envStore);
      const clientOptions: ClientOptions = { url };
      client = createClient(clientOptions);
    }

    const unsubscribe = clientSubscribe();
    const subscriber: Subscription<T> = { next, unsubscribe };
    subscribers.add(subscriber);
    next(value);

    return () => {
      subscriber.unsubscribe();
      subscribers.delete(subscriber);

      if (subscribers.size === 0 && client) {
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
