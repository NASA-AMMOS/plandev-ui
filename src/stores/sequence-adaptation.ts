import {
  seqJsonOutputAdaptation,
  seqnAdaptation,
  type NewAdaptationInterface,
} from '@nasa-jpl/aerie-sequence-languages';
import { derived, writable, type Writable } from 'svelte/store';
import type { SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Defaults */

const defaultAdaptation: NewAdaptationInterface = {
  input: seqnAdaptation,
  outputs: [seqJsonOutputAdaptation],
};

/* Writeable */

export const sequenceAdaptation: Writable<NewAdaptationInterface> = writable(defaultAdaptation);

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
  sequenceAdaptation.set(newSequenceAdaptation ?? defaultAdaptation);
}
