import { writable, type Writable } from 'svelte/store';
import type { ModelSlim } from '../types/model';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writeable. */
export const creatingModel: Writable<boolean> = writable(false);

export const createModelError: Writable<string | null> = writable(null);

/* Subscriptions. */

export const models = gqlSubscribable<ModelSlim[]>(gql.SUB_MODELS, {}, [], null);

/* Helper Functions. */

export function resetModelStores() {
  creatingModel.set(false);
  createModelError.set(null);
}
