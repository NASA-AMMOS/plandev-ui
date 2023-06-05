import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ExpansionRule, ExpansionSequence, ExpansionSet } from '../types/expansion';
import gql from '../utilities/gql';
import type { Status } from '../utilities/status';
import { simulationDatasetId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const expansionRules = gqlSubscribable<ExpansionRule[]>(gql.SUB_EXPANSION_RULES, {}, []);

export const expansionSequences = gqlSubscribable<ExpansionSequence[]>(gql.SUB_EXPANSION_SEQUENCES, {}, []);

export const expansionSets = gqlSubscribable<ExpansionSet[]>(gql.SUB_EXPANSION_SETS, {}, []);

/* Writeable. */

export const creatingExpansionSequence: Writable<boolean> = writable(false);

export const expansionRulesColumns: Writable<string> = writable('1fr 3px 2fr');

export const expansionSetsColumns: Writable<string> = writable('1fr 3px 2fr');

export const expansionRunsColumns: Writable<string> = writable('1fr 3px 2fr');

export const savingExpansionRule: Writable<boolean> = writable(false);

export const savingExpansionSet: Writable<boolean> = writable(false);

export const planExpansionStatus: Writable<Status | null> = writable(null);

export const selectedExpansionSetId: Writable<number | null> = writable(null);

/* Derived. */

export const filteredExpansionSequences: Readable<ExpansionSequence[]> = derived(
  [expansionSequences, simulationDatasetId],
  ([$expansionSequences, $simulationDatasetId]) =>
    $expansionSequences.filter(sequence => sequence.simulation_dataset_id === $simulationDatasetId),
);

export function resetExpansionStores(): void {
  creatingExpansionSequence.set(false);
  savingExpansionRule.set(false);
  savingExpansionSet.set(false);
  planExpansionStatus.set(null);
  selectedExpansionSetId.set(null);
}
