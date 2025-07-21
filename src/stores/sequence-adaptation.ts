import { derived, writable, type Writable } from 'svelte/store';
import type { NewAdaptationInterface } from '../language-package/interfaces/new-adaptation-interface';
import { defaultAdaptation as defaultNewAdaptation } from '../language-package/languages/seq-n/adaptation';
import type { SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writeable */

export const sequenceAdaptation: Writable<NewAdaptationInterface> = writable(defaultNewAdaptation);

/* Subscriptions. */

export const sequenceAdaptations = gqlSubscribable<SequenceAdaptationMetadata[]>(
  gql.SUB_SEQUENCE_ADAPTATIONS,
  {},
  [],
  null,
);

/* Derived */

export const inputFormat = derived([sequenceAdaptation], ([$sequenceAdaptation]) => $sequenceAdaptation.input);

/* Helpers */

export function setSequenceAdaptation(newSequenceAdaptation: NewAdaptationInterface | undefined): void {
  // Set the adaptation wholesale, not as a partial update like we did before.
  sequenceAdaptation.set(newSequenceAdaptation ?? defaultNewAdaptation)
}
