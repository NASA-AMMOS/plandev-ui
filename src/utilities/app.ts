import { browser } from '$app/env';
import { get } from 'svelte/store';
import { env as envStore } from '../stores/app';
import type { Env } from '../types';

export function gatewayUrl() {
  const { GATEWAY_CLIENT_URL, GATEWAY_SERVER_URL } = get<Env>(envStore);
  if (browser) {
    return GATEWAY_CLIENT_URL;
  } else {
    return GATEWAY_SERVER_URL;
  }
}

export function hasuraUrl() {
  const { HASURA_CLIENT_URL, HASURA_SERVER_URL } = get<Env>(envStore);
  if (browser) {
    return HASURA_CLIENT_URL;
  } else {
    return HASURA_SERVER_URL;
  }
}

export function schedulerUrl() {
  const { SCHEDULER_CLIENT_URL, SCHEDULER_SERVER_URL } = get<Env>(envStore);
  if (browser) {
    return SCHEDULER_CLIENT_URL;
  } else {
    return SCHEDULER_SERVER_URL;
  }
}
