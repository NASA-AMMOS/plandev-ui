import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { type ClientOptions } from 'graphql-ws';
import { debounce, isEqual } from 'lodash-es';
import { get, type Readable, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store';
// import WebSocket from 'ws';
import { gqlWsClient, userStore } from '../lib/stores/auth';
import type { User } from '../types/app';
import type { GqlSubscribable, NextValue, QueryVariables, Subscription } from '../types/subscribable';
import { EXPIRED_JWT } from '../utilities/permissions';

// TODO: move this to a different file?
export function getClientOptions(): ClientOptions {
  if (!browser) {
    throw new Error('getClientOptions() is being called on the server');
  }

  console.log('HERE2');
  // let token: string;
  // if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
  //   token = user?.token ?? cookie.parse(document.cookie)['accessToken'];
  // } else {
  //   token = user?.token ?? getTokenFromUserCookie();
  // }
  // const clientOptions: ClientOptions = {
  //   connectionParams: {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       'x-hasura-role': getRoleFromCookie(),
  //     },
  //   },
  //   url: env.PUBLIC_HASURA_WEB_SOCKET_URL,
  // };

  const clientOptions: ClientOptions = {
    connectionParams: async () => {
      console.log('Calculating connection params for socket...'); // NOTE: provable keeps restarting and not reuisng same connection, but since this is slightly better than error handling and we also know we can piggyback multiple connections, we are going with it. ideally we could reuse the same connection the whole time but it retains the access token and ignores all other connection_inits. if there's a way to make hasura NOT ignore that or something else that would be cool but it seems the graphql-ws protocol is not written to support that :/
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

        // const socket = uncastedSocket as WebSocket;

        // // TODO: save the unsubscribe somewhere?
        // // TODO: see what happens if you remove this, since we are 99% sure this didn't even work
        // userStore.subscribe(() => {
        //   if (socket.readyState === WebSocket.OPEN) {
        //     console.log('Sending new bearer token...');
        //     socket.send(
        //       JSON.stringify({
        //         payload: { headers: { Authorization: `Bearer ${get(userStore)?.token}`, type: 'connection_init' } },
        //       }),
        //     );
        //   } else {
        //     console.warn('Will not send new bearer token, socket is not open.'); // continues to fire every time....even when connection closed. probably wanna clean this up by removing the current subscription. it seems this bearerToken.subscribe doesn't return an unsubscribe
        //   }
        // });
        // // console.log("UNSUBSCRIBE BEARER TOKEN, TYPE?", typeof unsubscribeBearerToken)
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
  _: User | null, // TODO: remove this eventually. leaving it here for ease of use, like in reqHasura, because refactoring all calls is a hassle. but this will use the store instead
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
              // This should never be triggered in the OIDC case, because we have refreshes.
              console.log('Here', query, variables);

              // TODO: if we do land here, what do we do???

              // // if client options isn't even defined, just ignore
              // if (clientOptions) {
              //   const newClientOptions = getClientOptions();
              //   const oldAccessToken = (clientOptions.connectionParams as any)['headers']['Authorization'].split(
              //     'Bearer ',
              //   )[1];
              //   const newAccessToken = (newClientOptions.connectionParams as any)['headers']['Authorization'].split(
              //     'Bearer ',
              //   )[1];

              //   // console.log(oldAccessToken, newAccessToken);

              //   // if the client's token matches the current token and its still expired, then there's a real problem. but if not, it should be updated
              //   if (oldAccessToken !== newAccessToken) {
              //     console.log('RESUBSCRIBING', query.split('{')[0]);
              //     resubscribe(); // replacing tokens and resubscribing seems to be the best we can do. not sure how to trigger a resubscribe for all active gqlSubscribable's on cookie update...
              //   } else {
              //     console.log('ITS BEYOND OVER');
              //     await logout(EXPIRED_JWT);
              //   }
              // }
            } else {
              subscribers.forEach(({ next }) => {
                // console.log('firing', query.split('{')[0]);
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
   *
  function getTokenFromUserCookie(): string {
    if (browser && document?.cookie) {
      const userCookie = cookie.parse(document.cookie)['user'];
      if (userCookie) {
        try {
          const decodedUserCookie = atob(decodeURIComponent(userCookie));
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
   *
  function getRoleFromCookie(): string {
    if (browser && document?.cookie) {
      const activeRoleCookie = cookie.parse(document.cookie)['activeRole'];
      if (activeRoleCookie) {
        return activeRoleCookie;
      } else {
        console.warn(`No 'activeRole' cookie present.`);
      }
    }
    return '';
  }*/

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
