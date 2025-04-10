import { derived, writable, type Writable } from 'svelte/store';
import type { Status } from '../enums/status';
import type { ActivityType } from '../types/activity';
import { type ExpandedTemplate, type SequenceTemplate } from '../types/sequence-template';
import gql from '../utilities/gql';
import { planSimDatasetMapping } from './expansion';
import { gqlSubscribable } from './subscribable';

/* Writable */

export const selectedSequenceTemplateId: Writable<number | null> = writable(null);

export const sequenceTemplateExpansionStatus: Writable<Status | null> = writable(null);

export const sequenceTemplateExpansionError: Writable<string | null> = writable(null);

export const newTemplateModelId: Writable<number> = writable(-1);

/* Subscriptions. */

export const newTemplateActivityTypes = gqlSubscribable<ActivityType[]>(
  gql.SUB_ACTIVITY_TYPES,
  { modelId: newTemplateModelId },
  [],
  null,
);

export const expandedTemplates = gqlSubscribable<ExpandedTemplate[]>(gql.SUB_EXPANDED_TEMPLATES, {}, [], null);

export const sequenceTemplates = gqlSubscribable<SequenceTemplate[]>(gql.SUB_SEQUENCE_TEMPLATES, {}, [], null);

export const allTemplates = gqlSubscribable<
  { expanded_template: string; seq_id: string; simulation_dataset_id: number }[]
>(gql.SUB_MOST_RECENT_EXPANSION_FOR_SIMULATION_TEMPS, {}, null, null);

/* Derived */
export const lastTemplatedSimulationDatasetId = derived(
  [allTemplates, planSimDatasetMapping],
  ([$allTemplates, $planSimDatasetMapping]) => {
    if (!$allTemplates || !$planSimDatasetMapping) {
      return -1;
    }
    const filteredDatasets = $planSimDatasetMapping.simulations[0].simulation_datasets.map(entry => entry.id);

    const lastExpansion = $allTemplates
      .filter(entry => filteredDatasets.includes(entry.simulation_dataset_id))
      .sort((a, b) => b.simulation_dataset_id - a.simulation_dataset_id)[0];
    return lastExpansion?.simulation_dataset_id ?? -1;
  },
);

/* Helper Functions. */
export function resetSequenceTemplateStores(): void {
  selectedSequenceTemplateId.set(null);
  sequenceTemplateExpansionStatus.set(null);
  sequenceTemplateExpansionError.set(null);
  newTemplateModelId.set(-1);
}
