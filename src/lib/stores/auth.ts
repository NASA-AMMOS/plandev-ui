import { type Client } from 'graphql-ws';
import { writable, type Writable } from 'svelte/store';
import type { User } from '../../types/app';

// no need for id token because that's only used serverside. no need for activeRole cookie because that's part of the user...we just need to make sure that when it is updated, it is reflected in user store
// TODO: make sure updates to active role are reflected and read from userStore
export const userStore: Writable<User | undefined> = writable<User | undefined>(); // TODO: make it User | null
export const gqlWsClient: Writable<Client | undefined> = writable<Client | undefined>(); // TODO: add more robust handling for if this is null
