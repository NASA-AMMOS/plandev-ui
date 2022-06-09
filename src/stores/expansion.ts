import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { compare } from '../utilities/generic';
import gql from '../utilities/gql';
import { simulationDatasetId } from './simulation';
import { getGqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activityTypeNames = getGqlSubscribable<Pick<ActivityType, 'name'>[]>(
  gql.SUB_ACTIVITY_TYPE_NAMES,
  { modelId: -1 },
  [],
);

export const dictionaries = getGqlSubscribable<CommandDictionary[]>(gql.SUB_COMMAND_DICTIONARIES, {}, []);

export const expansionRules = getGqlSubscribable<ExpansionRule[]>(gql.SUB_EXPANSION_RULES, {}, []);

export const expansionSets = getGqlSubscribable<ExpansionSet[]>(gql.SUB_EXPANSION_SETS, {}, []);

export const sequences = getGqlSubscribable<Sequence[]>(gql.SUB_SEQUENCES, {}, []);

/* Writeable. */

export const creatingDictionary: Writable<boolean> = writable(false);

export const createDictionaryError: Writable<string | null> = writable(null);

export const creatingSequence: Writable<boolean> = writable(false);

export const expansionRulesColumns: Writable<string> = writable('1fr 1px 1fr');

export const expansionSetsColumns: Writable<string> = writable('1fr 1px 1fr');

export const savingExpansionRule: Writable<boolean> = writable(false);

export const savingExpansionSet: Writable<boolean> = writable(false);

export const expandingPlan: Writable<boolean> = writable(false);

/* Derived. */

export const filteredSequences: Readable<Sequence[]> = derived(
  [sequences, simulationDatasetId],
  ([$sequences, $simulationDatasetId]) =>
    $sequences.filter(sequence => sequence.simulation_dataset_id === $simulationDatasetId),
);

export const sortedDictionaries: Readable<CommandDictionary[]> = derived(dictionaries, $dictionaries => {
  if ($dictionaries) {
    return $dictionaries.sort((a, b) => compare(a.version, b.version));
  }
  return [];
});
