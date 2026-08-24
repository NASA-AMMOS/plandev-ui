import { derived, writable, type Writable } from 'svelte/store';
import type { Status } from '../enums/status';
import { type ExpandedTemplate, type SequenceTemplate } from '../types/sequence-template';
import gql from '../utilities/gql';
import { simulationDatasetsPlan } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Writable */

export const selectedSequenceTemplateId: Writable<number | null> = writable(null);

export const sequenceTemplateExpansionStatus: Writable<Status | null> = writable(null);

export const sequenceTemplateExpansionError: Writable<string | null> = writable(null);

/* Subscriptions. */
export const expandedTemplates = gqlSubscribable<ExpandedTemplate[]>(gql.SUB_EXPANDED_TEMPLATES, {}, []);

export const sequenceTemplates = gqlSubscribable<SequenceTemplate[]>(gql.SUB_SEQUENCE_TEMPLATES, {}, []);

/* Derived */
export const lastTemplatedSimulationDatasetId = derived(
  [expandedTemplates, simulationDatasetsPlan],
  ([$expandedTemplates, $simulationDatasetsPlan]) => {
    if (!$simulationDatasetsPlan) {
      return -1;
    }
    const simulationDatasetIds = new Set($simulationDatasetsPlan.map(dataset => dataset.id));

    const lastExpansion = $expandedTemplates
      .filter(template => simulationDatasetIds.has(template.simulation_dataset_id))
      .sort((a, b) => b.simulation_dataset_id - a.simulation_dataset_id)[0];

    return lastExpansion?.simulation_dataset_id ?? -1;
  },
);

/* Helper Functions. */
export function resetSequenceTemplateStores(): void {
  selectedSequenceTemplateId.set(null);
  sequenceTemplateExpansionStatus.set(null);
  sequenceTemplateExpansionError.set(null);
}
