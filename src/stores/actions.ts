import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { Action, ActionRun } from '../types/actions';

/* Writable */
export const actionsColumns: Writable<string> = writable('.75fr 3px 1.5fr');

export const actions: Writable<Action[]> = writable([
  { actionJS: 'some code 1', description: 'Description 1', id: 1, name: 'Action 1' },
  { actionJS: 'some code 2', description: 'Description 2', id: 2, name: 'Action 2' },
]);

export const actionRuns: Writable<ActionRun[]> = writable([
  {
    actionId: 1,
    id: 1,
    response: {
      console: { debug: [], error: [], info: [], log: [], warn: [] },
      errors: null,
      results: { data: { var1: 'Foo', var2: 'Bar' }, status: 'SUCCESS' },
    },
    user: 'aplave',
  },
  {
    actionId: 2,
    id: 2,
    response: {
      console: { debug: [], error: [], info: [], log: [], warn: [] },
      errors: {
        cause: 'sdfsdf',
        message: 'This failed because...',
        stack: 'Stacktrace...',
      },
      results: null,
    },
    user: 'aplave',
  },
]);

/* Derived */
export const actionsMap: Readable<Record<number, Action>> = derived(actions, $actions => {
  return keyBy($actions, 'id');
});
