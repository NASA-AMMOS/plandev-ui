import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { compare } from '../utilities/generic';
import gql from '../utilities/gql';
import { simulationDatasetId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activityTypeNames = gqlSubscribable<Pick<ActivityType, 'name'>[]>(
  gql.SUB_ACTIVITY_TYPE_NAMES,
  { modelId: -1 },
  [],
);

export const dictionaries = gqlSubscribable<CommandDictionary[]>(gql.SUB_COMMAND_DICTIONARIES, {}, []);

export const expansionRules = gqlSubscribable<ExpansionRule[]>(gql.SUB_EXPANSION_RULES, {}, []);

export const expansionSequences = gqlSubscribable<ExpansionSequence[]>(gql.SUB_EXPANSION_SEQUENCES, {}, []);

export const expansionSets = gqlSubscribable<ExpansionSet[]>(gql.SUB_EXPANSION_SETS, {}, []);

/* Writeable. */

export const creatingDictionary: Writable<boolean> = writable(false);

export const createDictionaryError: Writable<string | null> = writable(null);

export const creatingExpansionSequence: Writable<boolean> = writable(false);

export const expansionRulesColumns: Writable<string> = writable('1fr 1px 2fr');

export const expansionSetsColumns: Writable<string> = writable('1fr 1px 2fr');

export const savingExpansionRule: Writable<boolean> = writable(false);

export const savingExpansionSet: Writable<boolean> = writable(false);

export const expandingPlan: Writable<boolean> = writable(false);

/* Derived. */

export const filteredExpansionSequences: Readable<ExpansionSequence[]> = derived(
  [expansionSequences, simulationDatasetId],
  ([$expansionSequences, $simulationDatasetId]) =>
    $expansionSequences.filter(sequence => sequence.simulation_dataset_id === $simulationDatasetId),
);

export const sortedDictionaries: Readable<CommandDictionary[]> = derived(dictionaries, $dictionaries => {
  if ($dictionaries) {
    return $dictionaries.sort((a, b) => compare(a.version, b.version));
  }
  return [];
});
