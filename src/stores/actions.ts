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
    return $actionDefinitions.reduce((acc: Record<number, Record<number, ActionDefinition>>, actionDefinition) => {
      if (!acc[actionDefinition.workspace_id]) {
        acc[actionDefinition.workspace_id] = {};
      }
      acc[actionDefinition.workspace_id][actionDefinition.id] = actionDefinition;
      return acc;
    }, {});
  },
);

export const actionRunsByWorkspace: Readable<Record<number, Record<number, ActionRunSlim>>> = derived(
  actionRuns,
  $actionRuns => {
    if (!$actionRuns) {
      return {};
    }
    return $actionRuns.reduce((acc: Record<number, Record<number, ActionRunSlim>>, actionRun) => {
      if (!acc[actionRun.action_definition.workspace_id]) {
        acc[actionRun.action_definition.workspace_id] = {};
      }
      acc[actionRun.action_definition.workspace_id][actionRun.id] = actionRun;
      return acc;
    }, {});
  },
);
