import { browser } from '$app/env';
import type { Client, ClientOptions } from 'graphql-ws';
import { createClient as wsCreateClient } from 'graphql-ws';
import isEqual from 'lodash-es/isEqual';
import { noop } from 'svelte/internal';
import type { Subscriber, Unsubscriber } from 'svelte/store';
import { hasuraUrl } from '../utilities/app';

type Invalidator<T> = (value?: T) => void;
type NextValue<T> = { [key: string]: T };
type QueryVariables = Record<string, unknown>;
type SubscribeInvalidateTuple<T> = [Subscriber<T>, Invalidator<T>];

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
  const subscribers: Set<SubscribeInvalidateTuple<T>> = new Set();

  let client: Client | null;
  let unsubscribe: Unsubscriber | null;
  let value: T | null = initialValue;
  let variables: QueryVariables | null = initialVariables;

  function clientSubscribe() {
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
            subscribers.forEach(([next]) => next(initialValue));
          },
          next: ({ data }) => {
            const [key] = Object.keys(data);
            const { [key]: newValue } = data;
            if (!isEqual(value, newValue)) {
              value = newValue;
              subscribers.forEach(([next]) => next(value));
            }
          },
        },
      );
    }
  }

  function createClient() {
    if (browser && !client) {
      client = wsCreateClient(clientOptions);
    }
  }

  function destroy() {
    if (client && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      client.dispose();
      client = null;
    }
  }

  function setVariables(newVariables: QueryVariables): void {
    if (!isEqual(variables, newVariables)) {
      variables = newVariables;

      if (unsubscribe) {
        unsubscribe();
        clientSubscribe();
      }
    }
  }

  function subscribe(
    next: Subscriber<T>,
    invalidate: Invalidator<T> = noop,
  ): Unsubscriber {
    createClient();
    clientSubscribe();

    const subscriber: SubscribeInvalidateTuple<T> = [next, invalidate];
    subscribers.add(subscriber);
    next(value);

    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        destroy();
      }
    };
  }

  return {
    setVariables,
    subscribe,
  };
}
