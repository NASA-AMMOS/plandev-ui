import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ExpansionSequence } from '../types/expansion';
import gql from '../utilities/gql';
import { simulationDatasetId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const expansionSequences = gqlSubscribable<ExpansionSequence[]>(gql.SUB_EXPANSION_SEQUENCES, {}, []);

/* Writeable. */

export const creatingExpansionSequence: Writable<boolean> = writable(false);

/* Derived. */

export const filteredExpansionSequences: Readable<ExpansionSequence[]> = derived(
  [expansionSequences, simulationDatasetId],
  ([$expansionSequences, $simulationDatasetId]) =>
    $expansionSequences.filter(sequence => sequence.simulation_dataset_id === $simulationDatasetId),
);

export function resetExpansionStores(): void {
  creatingExpansionSequence.set(false);
}
