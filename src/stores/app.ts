import { writable } from 'svelte/store';

/* Data. */

export const defaultVersion: Version = {
  branch: 'unknown',
  commit: 'unknown',
  commitUrl: '',
  date: new Date().toLocaleString(),
  name: 'aerie-ui',
};

/* Writeable. */

export const user = writable<User | null>(null);

export const version = writable<Version>(defaultVersion);
