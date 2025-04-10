import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { Status } from '../enums/status';
import type { ExpansionRuleSlim, ExpansionSequence, ExpansionSet } from '../types/expansion';
import gql from '../utilities/gql';
import { planId } from './plan';
import { simulationDatasetId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const expansionRules = gqlSubscribable<ExpansionRuleSlim[]>(gql.SUB_EXPANSION_RULES, {}, [], null);

export const expansionSequences = gqlSubscribable<ExpansionSequence[]>(gql.SUB_EXPANSION_SEQUENCES, {}, [], null);

export const expansionSets = gqlSubscribable<ExpansionSet[]>(gql.SUB_EXPANSION_SETS, {}, [], null);

export const allSequences = gqlSubscribable<
  { expanded_sequence: string; seq_id: string; simulation_dataset_id: number }[]
>(gql.SUB_MOST_RECENT_EXPANSION_FOR_SIMULATION_SEQS, {}, null, null);
export const planSimDatasetMapping = gqlSubscribable<{ simulations: { simulation_datasets: { id: number }[] }[] }>(
  gql.SUB_MOST_RECENT_EXPANSION_FOR_SIMULATION_SIMS,
  { planId: planId },
  null,
  null,
);
export const lastExpandedSimulationDatasetId = derived(
  [allSequences, planSimDatasetMapping],
  ([$allSequences, $planSimDatasetMapping]) => {
    if (!$allSequences || !$planSimDatasetMapping) {
      return -1;
    }
    const filteredDatasets = $planSimDatasetMapping.simulations[0].simulation_datasets.map(entry => entry.id);

    const lastExpansion = $allSequences
      .filter(entry => filteredDatasets.includes(entry.simulation_dataset_id))
      .sort((a, b) => b.simulation_dataset_id - a.simulation_dataset_id)[0];
    return lastExpansion?.simulation_dataset_id ?? -1;
  },
);

/* Writeable. */

export const creatingExpansionSequence: Writable<boolean> = writable(false);

export const createExpansionRuleError: Writable<string | null> = writable(null);

export const expansionRulesColumns: Writable<string> = writable('2fr 3px 1fr');

export const expansionRulesFormColumns: Writable<string> = writable('1fr 3px 2fr');

export const expansionSetsColumns: Writable<string> = writable('2fr 3px 1fr');

export const expansionSetsFormColumns: Writable<string> = writable('1fr 3px 2fr');

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
  createExpansionRuleError.set(null);
  creatingExpansionSequence.set(false);
  savingExpansionRule.set(false);
  savingExpansionSet.set(false);
  planExpansionStatus.set(null);
  selectedExpansionSetId.set(null);
}
