import { writable } from 'svelte/store';
import type { Env, User } from '../types';

export const defaultEnv: Env = {
  GATEWAY_URL: 'http://localhost:9000',
  HASURA_URL: 'http://localhost:8080/v1/graphql',
  POSTGRES_DATABASE: 'aerie',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PASSWORD: 'aerie',
  POSTGRES_PORT: 5432,
  POSTGRES_USER: 'aerie',
};

export const env = writable<Env>(defaultEnv);
export const user = writable<User | null>(null);
