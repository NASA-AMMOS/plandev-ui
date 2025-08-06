import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { error as sverror } from '@sveltejs/kit';
import { type ClientOptions } from 'graphql-ws';
import { debounce, isEqual } from 'lodash-es';
import { get, type Readable, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store';
import { gqlWsClient, userStore } from '../lib/stores/auth';
import type { User } from '../types/app';
import type { GqlSubscribable, NextValue, QueryVariables, Subscription } from '../types/subscribable';
import { EXPIRED_JWT } from '../utilities/permissions';

export function getClientOptions(): ClientOptions {
  if (!browser) {
    throw new Error('getClientOptions() is being called on the server');
  }

  const clientOptions: ClientOptions = {
    connectionParams: async () => {
      console.log('Calculating connection params for socket...');
      // NOTE: provable keeps restarting and not reuisng same connection, but since
      // this is slightly better than error handling and we also know we can piggyback
      // multiple connections, we are going with it. ideally we could reuse the same
      // connection the whole time but it retains the access token and ignores all
      // other connection_inits. if there's a way to make hasura NOT ignore that or
      // something else that would be cool but it seems the graphql-ws protocol is
      // not written to support that :/
      console.log('Using token ', get(userStore)?.token);
      return {
        headers: {
          Authorization: `Bearer ${get(userStore)?.token}`,
          fakeHeader: 'from original connectionParams',
        },
      };
    },
    on: {
      closed: (socket: unknown) => {
        // console.log(typeof unsubscribeBearerToken)
        // unsubscribeBearerToken();
        console.log("WebSocket closed, I don't know if it really is disconnected though.");
        console.debug(socket as WebSocket);
      },
      connected: (_: unknown) => {
        console.log('WebSocket connected...');
      },
    },
    url: env.PUBLIC_HASURA_WEB_SOCKET_URL,
    webSocketImpl: WebSocket,
  };
  return clientOptions;
}

/**
 * Returns a Svelte store that listens to GraphQL subscriptions via graphql-ws.
 */
export function gqlSubscribable<T>(
  query: string,
  initialVariables: QueryVariables | null = null,
  initialValue: T | null = null,
  _: User | null, // TODO: remove this eventually. leaving it here for ease of use, because refactoring all calls is a hassle. but this will use the store instead
  transformer: (v: any) => T = v => v,
): GqlSubscribable<T> {
  const subscribers: Set<Subscription<T>> = new Set();
  let unsubscribe: Unsubscriber = () => undefined;
  let value: T | null = initialValue;
  let variableUnsubscribers: Unsubscriber[] = [];
  let variables: QueryVariables | null = initialVariables;
  // Debounce clientSubscribe calls within the same call stack so that the last subscribe call is the
  // only one within the stack that actually executes, otherwise we end up with duplicative subscriptions
  // with potentially stale data that the underyling graphql-ws library does not immediately cancel.
  const debouncedClientSubscribe = debounce(clientSubscribe, 0, { trailing: true });

  /**
   * Creates a subscription to the query within the web socket
   */
  function clientSubscribe() {
    const client = get(gqlWsClient);

    if (browser && client) {
      unsubscribe = client.subscribe<NextValue<T>>(
        {
          query,
          variables,
        },
        {
          complete: () => {},
          error: async (error: Error | CloseEvent) => {
            console.log('subscribe error');
            console.log(error);

            if ('reason' in error && error.reason.includes(EXPIRED_JWT)) {
              // An access token is expected to expire, the connection will self-heal though
              //    if it uses a function to provide connection parameters that can dynamically
              //    set the access token.
              // That being said, this should never be triggered in the OIDC case because we
              //    have refreshes.
              console.error(
                'Expired JWT in subscribe. Query, variables, and user in question:',
                query,
                variables,
                JSON.stringify(get(userStore)),
              );
              console.error('Throwing error...');

              throw sverror(
                401,
                `JWT Expired in gqlSubscribable.\nCited Reason: ${error.reason}\nFor query: ${query}.`,
              );
            } else {
              subscribers.forEach(({ next }) => {
                next(initialValue as T);
              });
            }
          },
          next: ({ data }) => {
            if (data != null) {
              const [key] = Object.keys(data);
              const { [key]: newValue } = data;
              if (!isEqual(value, newValue)) {
                value = transformer(newValue);
                subscribers.forEach(({ next }) => {
                  next(value as T);
                });
              }
            }
          },
        },
      );
    } else {
      unsubscribe = () => undefined;
    }
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
    unsubscribe();
    debouncedClientSubscribe();
  }

  function setVariables(newVariables: QueryVariables): void {
    newVariables = { ...variables, ...newVariables };

    if (!isEqual(variables, newVariables)) {
      variables = newVariables;
      subscribeToVariables(variables);
      resubscribe();
    }
  }

  /**
   * Subscribe to the variables passed into the store.
   * These variables could be stores themselves or plain values.
   */
  function subscribeToVariables(initialVariables: QueryVariables | null): void {
    variableUnsubscribers.forEach(variableUnsubscribe => variableUnsubscribe());
    variableUnsubscribers = [];

    if (initialVariables !== null) {
      for (const [name, variable] of Object.entries(initialVariables)) {
        if (typeof variable === 'object' && variable?.subscribe !== undefined) {
          // If this variable is a store, subscribe to the store and when the store
          // updates, update our local cache of all of the variables from all of the stores
          // and resubscribe to the main query with those new variables
          const store = variable as Readable<any>;
          const unsubscriber = store.subscribe(storeValue => {
            variables = { ...variables, [name]: storeValue };
            resubscribe();
          });
          variableUnsubscribers.push(unsubscriber);
        }
      }
    }
  }

  function subscribe(next: Subscriber<T>): Unsubscriber {
    // If we are in the browser and do not yet have a web socket client
    // we will create one and subscribe to variables
    // if (browser && !client) { // this check only made sense if client:gqlSubscribe was 1:1
    subscribeToVariables(variables); // TODO: I'm 90% sure not harmful if this runs every time subscribe is called....  //initialVariables);

    // Subscribe within the WS to the GQL query
    // Note that subscribeToVariables may immediately result in a resubscription if
    // any of the variables are stores since the stores will call next(value) on
    // initial subscription. This call below covers the case where no stores are passed
    // in as variables. If resubscribe is called by subscribeToVariables then the debounce
    // should take care of the duplication.
    debouncedClientSubscribe();
    // }

    const subscriber: Subscription<T> = { next };
    subscribers.add(subscriber);
    next(value as T);

    return () => {
      subscribers.delete(subscriber);

      if (subscribers.size === 0) {
        //&& client) {
        unsubscribe();
        variableUnsubscribers.forEach(variableUnsubscribe => variableUnsubscribe());
        variableUnsubscribers = [];

        // TODO: move this to the destroy method for the client, or maybe the onDestroy of layout.svelte
        // client.dispose();
        // client = null;
      }
    };
  }

  function updateValue(fn: Updater<T>): void {
    value = fn(value as T);
    subscribers.forEach(({ next }) => {
      next(value as T);
    });
  }

  return {
    filterValueById,
    setVariables,
    subscribe,
    updateValue,
  };
}
