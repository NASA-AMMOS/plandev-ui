import { seqJsonToSeqn, seqnToSeqJson } from '@nasa-jpl/aerie-sequence-languages';
import { derived, get, writable, type Writable } from 'svelte/store';
import type { GlobalType } from '../types/global-type';
import type { ISequenceAdaptation, SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { sequenceAutoIndent } from '../utilities/sequence-editor/sequence-autoindent';
import { sequenceCompletion } from '../utilities/sequence-editor/sequence-completion';
import { gqlSubscribable } from './subscribable';

const defaultAdaptation: ISequenceAdaptation = {
  argDelegator: undefined,
  autoComplete: sequenceCompletion,
  autoIndent: sequenceAutoIndent,
  globals: [],
  inputFormat: {
    linter: undefined,
    name: 'SeqN',
    toInputFormat: async input => seqJsonToSeqn(JSON.parse(input)),
  },
  modifyOutput: undefined,
  modifyOutputParse: undefined,
  outputFormat: [
    {
      fileExtension: 'json',
      name: 'Seq JSON',
      toOutputFormat: async (...args: Parameters<typeof seqnToSeqJson>) =>
        JSON.stringify(seqnToSeqJson(...args), null, 2),
    },
  ],
};

/* Writeable */

export const sequenceAdaptation: Writable<ISequenceAdaptation> = writable(defaultAdaptation);

/* Subscriptions. */

export const sequenceAdaptations = gqlSubscribable<SequenceAdaptationMetadata[]>(
  gql.SUB_SEQUENCE_ADAPTATIONS,
  {},
  [],
  null,
);

/* Derived */

export const inputFormat = derived([sequenceAdaptation], ([$sequenceAdaptation]) => $sequenceAdaptation?.inputFormat);

export const outputFormat = derived(
  [sequenceAdaptation],
  ([$sequenceAdaptation]) => $sequenceAdaptation?.outputFormat ?? [],
);

/* Helpers */

export function getGlobals(): GlobalType[] {
  return get(sequenceAdaptation).globals ?? [];
}

export function setSequenceAdaptation(newSequenceAdaptation: Partial<ISequenceAdaptation> | undefined): void {
  sequenceAdaptation.set({
    argDelegator: newSequenceAdaptation?.argDelegator ?? defaultAdaptation.argDelegator,
    autoComplete: newSequenceAdaptation?.autoComplete ?? defaultAdaptation.autoComplete,
    autoIndent: newSequenceAdaptation?.autoIndent ?? defaultAdaptation.autoIndent,
    globals: newSequenceAdaptation?.globals ?? defaultAdaptation.globals,
    inputFormat: {
      linter: newSequenceAdaptation?.inputFormat?.linter ?? defaultAdaptation.inputFormat.linter,
      name: newSequenceAdaptation?.inputFormat?.name ?? defaultAdaptation.inputFormat.name,
      toInputFormat: newSequenceAdaptation?.inputFormat?.toInputFormat ?? defaultAdaptation.inputFormat.toInputFormat,
    },
    modifyOutput: newSequenceAdaptation?.modifyOutput ?? defaultAdaptation.modifyOutput,
    modifyOutputParse: newSequenceAdaptation?.modifyOutputParse ?? defaultAdaptation.modifyOutputParse,
    outputFormat: newSequenceAdaptation?.outputFormat ?? defaultAdaptation.outputFormat,
  });
}
