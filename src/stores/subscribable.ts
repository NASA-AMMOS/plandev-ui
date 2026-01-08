import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createClient, type Client, type ClientOptions, type Message } from 'graphql-ws';
import { debounce, isEqual, uniqueId } from 'lodash-es';
import { type Readable, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store';
import type { BaseUser, User } from '../types/app';
import type { GqlSubscribable, NextValue, QueryVariables, Subscription } from '../types/subscribable';
import { logout } from '../utilities/login';
import { EXPIRED_JWT } from '../utilities/permissions';
import { addSubscription, removeSubscription, updateSubscription } from './subscriptionsManager';

/**
 * Returns a Svelte store that listens to GraphQL subscriptions via graphql-ws.
 */
export function gqlSubscribable<T>(
  query: string,
  initialVariables: QueryVariables | null = null,
  initialValue: T | null = null,
  user: User | null,
  transformer: (v: any) => T = v => v,
): GqlSubscribable<T> {
  const subscribers: Set<Subscription<T>> = new Set();
  let client: Client | null;
  let unsubscribe: Unsubscriber = () => undefined;
  let value: T | null = initialValue;
  let variableUnsubscribers: Unsubscriber[] = [];
  let variables: QueryVariables | null = initialVariables;
  let loading: boolean = true;
  let error: string = '';

  // Subscribers for the _loading and _error stores
  const loadingSubscribers: Set<Subscriber<boolean>> = new Set();
  const errorSubscribers: Set<Subscriber<string>> = new Set();

  function setLoading(newLoading: boolean) {
    if (loading !== newLoading) {
      loading = newLoading;
      loadingSubscribers.forEach(subscriber => subscriber(loading));
    }
  }

  function setError(newError: string) {
    if (error !== newError) {
      error = newError;
      errorSubscribers.forEach(subscriber => subscriber(error));
    }
  }

  // Create readable stores for loading and error
  const loadingStore: Readable<boolean> = {
    subscribe: (subscriber: Subscriber<boolean>) => {
      loadingSubscribers.add(subscriber);
      subscriber(loading);
      return () => {
        loadingSubscribers.delete(subscriber);
      };
    },
  };

  const errorStore: Readable<string> = {
    subscribe: (subscriber: Subscriber<string>) => {
      errorSubscribers.add(subscriber);
      subscriber(error);
      return () => {
        errorSubscribers.delete(subscriber);
      };
    },
  };

  // Debounce clientSubscribe calls within the same call stack so that the last subscribe call is the
  // only one within the stack that actually executes, otherwise we end up with duplicative subscriptions
  // with potentially stale data that the underyling graphql-ws library does not immediately cancel.
  const debouncedClientSubscribe = debounce(clientSubscribe, 0, { trailing: true });

  let restartRequested = false;
  let restart: () => void = () => (restartRequested = true);

  // Extract query name for descriptive subscription IDs (helps with debugging)
  const queryMatch = query.match(/subscription\s+(\w+)/i);
  const queryName = queryMatch?.[1] ?? 'unknown';
  const id = `${queryName}-${uniqueId()}`;

  /**
   * Creates a subscription to the query within the web socket
   */
  function clientSubscribe() {
    if (browser && client) {
      unsubscribe = client.subscribe<NextValue<T>>(
        {
          query,
          variables,
        },
        {
          complete: () => {},
          error: async (err: Error | CloseEvent) => {
            console.error('Socket subscribe error', err);

            if ('reason' in err && err.reason.includes(EXPIRED_JWT)) {
              await logout(EXPIRED_JWT);
            } else {
              let newError: string;
              if (Array.isArray(err)) {
                newError = err.map(e => e.message ?? 'Unknown socket error').join(', ');
              } else if ('message' in err) {
                newError = err.message;
              } else {
                newError = 'Unknown socket error';
              }
              setError(newError);
              updateSubscription(id, { error });
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

  /**
   * Helper that parses a user cookie to get a token.
   * @todo We should migrate away from doing this and just pass the
   * user to the subscription during initialization.
   */
  function getTokenFromUserCookie(): string {
    if (browser && document?.cookie) {
      const cookies = document.cookie.split(/\s*;\s*/);
      const userCookie = cookies.find(entry => entry.startsWith('user='));
      if (userCookie) {
        try {
          const splitCookie = userCookie.split('user=')[1];
          const decodedUserCookie = atob(decodeURIComponent(splitCookie));
          const parsedUserCookie: BaseUser = JSON.parse(decodedUserCookie);
          return parsedUserCookie.token;
        } catch (e) {
          console.log(e);
          return '';
        }
      } else {
        console.log(`No 'user' cookie found`);
      }
    }

    return '';
  }

  /**
   * Helper that parses a user cookie to get a token.
   * @todo We should migrate away from doing this and just pass the
   * user to the subscription during initialization.
   */
  function getRoleFromCookie(): string {
    if (browser && document?.cookie) {
      const cookies = document.cookie.split(/\s*;\s*/);
      const roleCookie = cookies.find(entry => entry.startsWith('activeRole='));
      if (roleCookie) {
        return roleCookie.split('activeRole=')[1];
      } else {
        console.log(`No 'role' cookie found`);
      }
    }

    return '';
  }

  function resubscribe() {
    unsubscribe();
    debouncedClientSubscribe();
  }

  function restartSocket() {
    setLoading(true);
    setError(''); // Clear previous error on restart
    updateSubscription(id, { error, loading });
    restart();
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
    if (browser && !client) {
      const clientOptions: ClientOptions = {
        // connectionParams is a function so it gets fresh token/role on each reconnect
        connectionParams: () => {
          return {
            headers: {
              Authorization: `Bearer ${user?.token ?? getTokenFromUserCookie()}`,
              'x-hasura-role': getRoleFromCookie(),
            },
          };
        },
        on: {
          error: (err: unknown) => {
            setError(err ? err.toString() : 'Unknown socket error');
            updateSubscription(id, { error });
          },
          message: (message: Message) => {
            if (loading && message.type === 'next') {
              setLoading(false);
              updateSubscription(id, { loading });
            }
          },
          opened: (socket: unknown) => {
            restart = () => {
              const ws = socket as WebSocket;
              if (ws.readyState === WebSocket.OPEN) {
                // Custom close code (4205) for role-change restart - triggers reconnection
                ws.close(4205, 'Client Restart');
              } else {
                // otherwise the socket might've closed, indicate that you want
                // a restart on the next opened event
                restartRequested = true;
              }
            };

            // just in case you were eager to restart
            if (restartRequested) {
              restartRequested = false;
              restart();
            }
          },
        },
        url: env.PUBLIC_HASURA_WEB_SOCKET_URL,
      };

      client = createClient(clientOptions); // WS subscription
      addSubscription(id, { error, loading, restart: restartSocket, query });
      subscribeToVariables(initialVariables);

      // Subscribe within the WS to the GQL query
      // Note that subscribeToVariables may immediately result in a resubscription if
      // any of the variables are stores since the stores will call next(value) on
      // initial subscription. This call below covers the case where no stores are passed
      // in as variables. If resubscribe is called by subscribeToVariables then the debounce
      // should take care of the duplication.
      debouncedClientSubscribe();
    }

    const subscriber: Subscription<T> = { next };
    subscribers.add(subscriber);
    next(value as T);

    return () => {
      subscribers.delete(subscriber);

      if (subscribers.size === 0 && client) {
        unsubscribe();
        variableUnsubscribers.forEach(variableUnsubscribe => variableUnsubscribe());
        variableUnsubscribers = [];
        client.dispose();
        client = null;
        removeSubscription(id);
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
    error: errorStore,
    filterValueById,
    loading: loadingStore,
    restartSocket,
    setVariables,
    subscribe,
    updateValue,
  };
}
