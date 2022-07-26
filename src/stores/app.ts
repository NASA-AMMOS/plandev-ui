import { writable } from 'svelte/store';

/* Data. */

export const defaultEnv: Env = {
  AUTH_TYPE: 'cam',
  GATEWAY_CLIENT_URL: 'http://localhost:9000',
  GATEWAY_SERVER_URL: 'http://localhost:9000',
  HASURA_CLIENT_URL: 'http://localhost:8080/v1/graphql',
  HASURA_SERVER_URL: 'http://localhost:8080/v1/graphql',
  HASURA_WEB_SOCKET_URL: 'ws://localhost:8080/v1/graphql',
};

export const defaultVersion: Version = {
  branch: 'unknown',
  commit: 'unknown',
  commitUrl: '',
  date: new Date().toLocaleString(),
  name: 'aerie-ui',
};

/* Writeable. */

export const env = writable<Env>(defaultEnv);

export const user = writable<User | null>(null);

export const version = writable<Version>(defaultVersion);
