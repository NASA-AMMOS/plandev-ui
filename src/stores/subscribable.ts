import { browser } from '$app/environment';
import { debounce, isEqual } from 'lodash-es';
import { type Readable, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store';
import type { User } from '../types/app';
import type { GqlSubscribable, NextValue, QueryVariables, Subscription } from '../types/subscribable';
import { logout } from '../utilities/login';
import { EXPIRED_JWT } from '../utilities/permissions';
import {
  clearPendingQueryName,
  getSharedClient,
  registerSubscription,
  restartSharedClient,
  setPendingQueryName,
  unregisterSubscription,
} from './gqlClient';
import { addSubscription, removeSubscription, updateSubscription } from './subscriptionsManager';

/**
 * Returns a Svelte store that listens to GraphQL subscriptions via graphql-ws.
 * All subscriptions share a single WebSocket connection via the gqlClient module.
 */
export function gqlSubscribable<T>(
  query: string,
  initialVariables: QueryVariables | null = null,
  initialValue: T | null = null,
  _user: User | null, // Kept for API compatibility, auth now handled by gqlClient
  transformer: (v: any) => T = v => v,
): GqlSubscribable<T> {
  const subscribers: Set<Subscription<T>> = new Set();
  let subscriptionCleanup: (() => void) | null = null;
  let subscriptionActive = false;
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

  // Extract query name for descriptive subscription IDs (helps with debugging)
  const queryMatch = query.match(/subscription\s+(\w+)/i);
  const queryName = queryMatch?.[1] ?? 'unknown';

  // Subscription ID - will be set when first subscriber connects
  let id: string = '';

  /**
   * Creates a subscription to the query within the shared web socket
   */
  function clientSubscribe() {
    const client = getSharedClient();
    if (browser && client && subscriptionActive) {
      // Clean up any existing subscription before creating new one
      if (subscriptionCleanup) {
        subscriptionCleanup();
        subscriptionCleanup = null;
      }

      // Set pending query name for generateID (ref count already handled in subscribe())
      setPendingQueryName(queryName);

      let receivedFirstMessage = false;

      subscriptionCleanup = client.subscribe<NextValue<T>>(
        {
          query,
          variables,
        },
        {
          complete: () => {
            // Subscription completed normally
          },
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
              updateSubscription(id, { error: newError });
              subscribers.forEach(({ next }) => {
                next(initialValue as T);
              });
            }
          },
          next: ({ data }) => {
            // Track first message to update loading state
            if (!receivedFirstMessage) {
              receivedFirstMessage = true;
              setLoading(false);
              updateSubscription(id, { loading: false });
            }

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

      // Clear the pending query name after subscription is created
      clearPendingQueryName();
    }
  }

  function filterValueById(filterId: number): void {
    updateValue(currentValue => {
      if (Array.isArray(currentValue)) {
        return currentValue.filter(v => v?.id !== filterId) as unknown as T;
      }
      return currentValue;
    });
  }

  function resubscribe() {
    if (subscriptionCleanup) {
      subscriptionCleanup();
      subscriptionCleanup = null;
    }
    debouncedClientSubscribe();
  }

  function restartSocket() {
    setLoading(true);
    setError(''); // Clear previous error on restart
    updateSubscription(id, { error: '', loading: true });
    // Restart the shared client - debounced so only restarts once
    restartSharedClient();
    // Resubscribe to reset internal state (receivedFirstMessage flag)
    resubscribe();
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
  function subscribeToVariables(initialVars: QueryVariables | null): void {
    variableUnsubscribers.forEach(variableUnsubscribe => variableUnsubscribe());
    variableUnsubscribers = [];

    if (initialVars !== null) {
      for (const [name, variable] of Object.entries(initialVars)) {
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
    // If we are in the browser and subscription is not yet active,
    // activate it using the shared client
    if (browser && !subscriptionActive) {
      // Generate a unique ID for this subscription instance
      id = registerSubscription(queryName);
      subscriptionActive = true;

      // Register with the subscription manager for tracking/restart
      addSubscription(id, { error, loading, query, restart: restartSocket });

      // Subscribe to variable stores
      subscribeToVariables(initialVariables);

      // Subscribe to the GraphQL query via the shared client
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

      if (subscribers.size === 0 && subscriptionActive) {
        // Clean up the GraphQL subscription
        if (subscriptionCleanup) {
          subscriptionCleanup();
          subscriptionCleanup = null;
        }

        // Clean up variable subscriptions
        variableUnsubscribers.forEach(variableUnsubscribe => variableUnsubscribe());
        variableUnsubscribers = [];

        // Unregister from shared client (for reference counting)
        unregisterSubscription();

        // Remove from subscription manager
        removeSubscription(id);

        subscriptionActive = false;
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
