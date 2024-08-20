import { derived, get, writable, type Writable } from 'svelte/store';
import type { GlobalType } from '../types/global-type';
import type { ISequenceAdaptation, SequenceAdaptation } from '../types/sequencing';
import gql from '../utilities/gql';
import { seqJsonToSequence } from '../utilities/sequence-editor/from-seq-json';
import { sequenceToSeqJson } from '../utilities/sequence-editor/to-seq-json';
import { gqlSubscribable } from './subscribable';

/* Writeable */

export const sequenceAdaptation: Writable<ISequenceAdaptation | undefined> = writable(undefined);

/* Subscriptions. */

export const sequenceAdaptations = gqlSubscribable<SequenceAdaptation[]>(gql.SUB_SEQUENCE_ADAPTATIONS, {}, [], null);

/* Derived */

export const inputFormat = derived([sequenceAdaptation], ([$sequenceAdaptation]) => $sequenceAdaptation?.inputFormat);

export const outputFormat = derived(
  [sequenceAdaptation],
  ([$sequenceAdaptation]) => $sequenceAdaptation?.outputFormat ?? [],
);

/* Helpers */

export function getGlobals(): GlobalType[] {
  return get(sequenceAdaptation)?.globals ?? [];
}

export function setSequenceAdaptation(newSequenceAdaptation: ISequenceAdaptation | undefined): void {
  sequenceAdaptation.set({
    argDelegator: newSequenceAdaptation?.argDelegator ?? undefined,
    conditionalKeywords: {
      else: newSequenceAdaptation?.conditionalKeywords?.else ?? 'CMD_ELSE',
      elseIf: newSequenceAdaptation?.conditionalKeywords?.elseIf ?? ['CMD_ELSE_IF'],
      endIf: newSequenceAdaptation?.conditionalKeywords?.endIf ?? 'CMD_END_IF',
      if: newSequenceAdaptation?.conditionalKeywords?.if ?? ['CMD_IF'],
    },
    globals: newSequenceAdaptation?.globals ?? [],
    inputFormat: {
      linter: newSequenceAdaptation?.inputFormat?.linter ?? undefined,
      name: newSequenceAdaptation?.inputFormat?.name ?? 'SeqN',
      toInputFormat: newSequenceAdaptation?.inputFormat?.toInputFormat ?? seqJsonToSequence,
    },
    loopKeywords: {
      break: newSequenceAdaptation?.loopKeywords?.break ?? 'CMD_BREAK',
      continue: newSequenceAdaptation?.loopKeywords?.continue ?? 'CMD_CONTINUE',
      endWhileLoop: newSequenceAdaptation?.loopKeywords?.endWhileLoop ?? 'CMD_END_WHILE_LOOP',
      whileLoop: newSequenceAdaptation?.loopKeywords?.whileLoop ?? ['CMD_WHILE_LOOP', 'CMD_WHILE_LOOP_OR'],
    },
    modifyOutput: newSequenceAdaptation?.modifyOutput ?? undefined,
    modifyOutputParse: newSequenceAdaptation?.modifyOutputParse ?? undefined,
    outputFormat: newSequenceAdaptation?.outputFormat ?? [
      {
        fileExtension: 'json',
        name: 'Seq JSON',
        toOutputFormat: sequenceToSeqJson,
      },
    ],
  });
}
