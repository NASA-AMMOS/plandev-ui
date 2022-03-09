import { writable } from 'svelte/store';

/** Data. */

export const defaultEnv: Env = {
  AUTH_TYPE: 'cam',
  GATEWAY_CLIENT_URL: 'http://localhost:9000',
  GATEWAY_SERVER_URL: 'http://localhost:9000',
  HASURA_CLIENT_URL: 'http://localhost:8080/v1/graphql',
  HASURA_SERVER_URL: 'http://localhost:8080/v1/graphql',
};

/** Stores. */

export const env = writable<Env>(defaultEnv);
export const user = writable<User | null>(null);
