import { type Client } from 'graphql-ws';
import { writable, type Writable } from 'svelte/store';
import type { User } from '../../types/app';

export const userStore: Writable<User | undefined> = writable<User | undefined>();
export const gqlWsClient: Writable<Client | undefined> = writable<Client | undefined>();
