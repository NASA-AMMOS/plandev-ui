import { browser } from '$app/env';
import type { Client, ClientOptions } from 'graphql-ws';
import { createClient } from 'graphql-ws';
import { isEqual } from 'lodash-es';
import type { Subscriber, Unsubscriber } from 'svelte/store';
import { hasuraUrl } from '../utilities/app';

type NextValue<T> = { [key: string]: T };
type QueryVariables = Record<string, unknown>;
type Subscription<T> = { next: Subscriber<T>; unsubscribe: Unsubscriber };

/**
 * Aerie UI specific wrapper around gqlSubscribable.
 */
export function getGqlSubscribable<T>(
  query: string,
  initialVariables: QueryVariables | null = null,
  initialValue: T | null = null,
) {
  const HASURA_URL = hasuraUrl();
  const [, baseUrl] = HASURA_URL.split('http://');
  const url = `ws://${baseUrl}`;
  const clientOptions: ClientOptions = { url };

  return gqlSubscribable<T>(
    clientOptions,
    query,
    initialVariables,
    initialValue,
  );
}

/**
 * Returns a Svelte store that listens to GraphQL subscriptions via graphql-ws.
 */
export function gqlSubscribable<T>(
  clientOptions: ClientOptions,
  query: string,
  initialVariables: QueryVariables | null = null,
  initialValue: T | null = null,
) {
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
              value = newValue;
              subscribers.forEach(({ next }) => next(value));
            }
          },
        },
      );
    }

    return unsubscribe;
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

  return {
    setVariables,
    subscribe,
  };
}
