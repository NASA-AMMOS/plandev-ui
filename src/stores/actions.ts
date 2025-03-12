import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActionDefinition, ActionRunSlim } from '../types/actions';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writable */
export const actionsColumns: Writable<string> = writable('.75fr 3px 1.5fr');

export const actionDefinitions = gqlSubscribable<ActionDefinition[] | null>(
  gql.SUB_ACTION_DEFINITIONS,
  null,
  null,
  null,
);

export const actionRuns = gqlSubscribable<ActionRunSlim[] | null>(gql.SUB_ACTION_RUNS, {}, null, null);

/* Derived */
export const actionDefinitionsByWorkspace: Readable<Record<number, Record<number, ActionDefinition>>> = derived(
  actionDefinitions,
  $actionDefinitions => {
    if (!$actionDefinitions) {
      return {};
    }
    return $actionDefinitions.reduce((acc: Record<number, Record<number, ActionDefinition>>, next) => {
      if (!acc[next.workspace_id]) {
        acc[next.workspace_id] = {};
      }
      acc[next.workspace_id][next.id] = next;
      return acc;
    }, {});
  },
);
