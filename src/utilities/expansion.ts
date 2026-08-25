import type { ExpansionSequence } from '../types/expansion';
import type { ExpandedTemplate } from '../types/sequence-template';

export function getExpandedTemplateForSequence(expandedTemplates: ExpandedTemplate[], sequence: ExpansionSequence) {
  return expandedTemplates.find(
    template =>
      template.seq_id === sequence.seq_id && template.simulation_dataset_id === sequence.simulation_dataset_id
  );
}
