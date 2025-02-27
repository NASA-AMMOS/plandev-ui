import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type { ExpansionRuleSlim, ExpansionSequence, ExpansionSet } from '../types/expansion';
import gql from '../utilities/gql';
import { planRevision } from './plan';
import { simulation, simulationDatasetId, simulationDatasetLatest } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const expansionRules = gqlSubscribable<ExpansionRuleSlim[]>(gql.SUB_EXPANSION_RULES, {}, [], null);

export const expansionSequences = gqlSubscribable<ExpansionSequence[]>(gql.SUB_EXPANSION_SEQUENCES, {}, [], null);

export const expansionSets = gqlSubscribable<ExpansionSet[]>(gql.SUB_EXPANSION_SETS, {}, [], null);

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

// this store is split into two parts. One is the writable one, written to in effects. It reflects when expansion is Incomplete, Complete, or Failed
// the aggregate one, used for actual display, factors in the writable one as well as whether the plan has been modified (like simulationStatus), to
//    let the user know if simulation should be re-run.
// We also added behavior that, on resimulation, expansion is still marked as modified and needing resimulation. This can and should be negotiated
//    because it's not _entirely_ correct. As a matter of fact, a comprehensive status that reflects all sequences having been re-expanded, especially
//    given that the old implementation has sequencing run on-the-fly, is a little more intense and should be discussed.
export const planExpansionStatusWritable: Writable<Status | null> = writable(null);
export const planExpansionStatus: Readable<Status | null> = derived(
  [planExpansionStatusWritable, planRevision, simulationDatasetLatest, simulation],
  ([$planExpansionStatusWritable, $planRevision, $simulationDataset, $simulation]) => {
    if (!$planExpansionStatusWritable || $planExpansionStatusWritable === Status.Complete) {
      // reflect if it has or hasn't been modified
      if (
        $simulationDataset &&
        $simulation &&
        ($planRevision !== $simulationDataset.plan_revision ||
          $simulation.revision !== $simulationDataset.simulation_revision)
      ) {
        return Status.Modified;
      } else {
        return $planExpansionStatusWritable;
      }
    }
    // otherwise, we are in the process of simulating (or simulation has been re-run, but this has yet to be updated); just show that
    return $planExpansionStatusWritable;
  },
  null,
);

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
  planExpansionStatusWritable.set(null);
  selectedExpansionSetId.set(null);
}
