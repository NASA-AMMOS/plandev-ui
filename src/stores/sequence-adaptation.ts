import {
  seqJsonLanguage,
  seqJsonToSeqn,
  seqnLanguage,
  seqnParser,
  seqnToSeqJson,
  type PhoenixAdaptation,
} from '@nasa-jpl/aerie-sequence-languages';
import { writable, type Writable } from 'svelte/store';
import type { SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Defaults */

const defaultAdaptation: PhoenixAdaptation = {
  input: seqnLanguage,
  outputs: [
    {
      ...seqJsonLanguage,
      toInputFormat: seq => seqJsonToSeqn(JSON.parse(seq)),
      toOutputFormat: (seq, context, name) =>
        JSON.stringify(seqnToSeqJson(seqnParser.parse(seq), seq, context.commandDictionary, name), null, 2),
    },
  ],
};

/* Writeable */

export const sequenceAdaptation: Writable<PhoenixAdaptation> = writable(defaultAdaptation);

/* Subscriptions. */

export const sequenceAdaptations = gqlSubscribable<SequenceAdaptationMetadata[]>(
  gql.SUB_SEQUENCE_ADAPTATIONS,
  {},
  [],
  null,
);

/* Derived */

/* Helpers */

export function setSequenceLanguages(adaptation: PhoenixAdaptation | undefined): void {
  // Set the adaptation wholesale, not as a partial update like we did before.
  if (adaptation) {
    sequenceAdaptation.set(adaptation);
  } else {
    sequenceAdaptation.set(defaultAdaptation);
  }
}
