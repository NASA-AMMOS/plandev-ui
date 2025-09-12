import { getSeqnLanguage, type PhoenixAdaptation, type PhoenixLanguages } from '@nasa-jpl/aerie-sequence-languages';
import { derived, writable, type Writable } from 'svelte/store';
import type { SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { phoenixResources } from '../utilities/sequence-editor/adaptation-resources';
import { gqlSubscribable } from './subscribable';

/* Defaults */

const defaultLanguages: PhoenixLanguages = {
  input: getSeqnLanguage(phoenixResources),
  outputs: [],
};

/* Writeable */

export const sequenceLanguages: Writable<PhoenixLanguages> = writable(defaultLanguages);

/* Subscriptions. */

export const sequenceAdaptations = gqlSubscribable<SequenceAdaptationMetadata[]>(
  gql.SUB_SEQUENCE_ADAPTATIONS,
  {},
  [],
  null,
);

/* Derived */

export const inputFormat = derived([sequenceLanguages], ([$sequenceLanguages]) => $sequenceLanguages.input);

/* Helpers */

export function setSequenceLanguages(adaptation: PhoenixAdaptation | undefined): void {
  // Set the adaptation wholesale, not as a partial update like we did before.
  sequenceLanguages.set(adaptation ? adaptation.getLanguages(phoenixResources) : defaultLanguages);
}
