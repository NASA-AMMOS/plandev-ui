import { derived, get, writable, type Writable } from 'svelte/store';
import type { GlobalType } from '../types/global-type';
import type { ISequenceAdaptation, SequenceAdaptation } from '../types/sequencing';
import gql from '../utilities/gql';
import { seqJsonToSequence } from '../utilities/sequence-editor/from-seq-json';
import { sequenceAutoIndent } from '../utilities/sequence-editor/sequence-autoindent';
import { sequenceCompletion } from '../utilities/sequence-editor/sequence-completion';
import { sequenceToSeqJson } from '../utilities/sequence-editor/to-seq-json';
import { gqlSubscribable } from './subscribable';

const defaultAdaptation: ISequenceAdaptation = {
  argDelegator: undefined,
  autoComplete: sequenceCompletion,
  autoIndent: sequenceAutoIndent,
  conditionalKeywords: {
    else: 'CMD_ELSE',
    elseIf: ['CMD_ELSE_IF'],
    endIf: 'CMD_END_IF',
    if: ['CMD_IF'],
  },
  globals: [],
  inputFormat: {
    linter: undefined,
    name: 'SeqN',
    toInputFormat: seqJsonToSequence,
  },
  loopKeywords: {
    break: 'CMD_BREAK',
    continue: 'CMD_CONTINUE',
    endWhileLoop: 'CMD_END_WHILE_LOOP',
    whileLoop: ['CMD_WHILE_LOOP', 'CMD_WHILE_LOOP_OR'],
  },
  modifyOutput: undefined,
  modifyOutputParse: undefined,
  outputFormat: [
    {
      fileExtension: 'json',
      name: 'Seq JSON',
      toOutputFormat: sequenceToSeqJson,
    },
  ],
};

/* Writeable */

export const sequenceAdaptation: Writable<ISequenceAdaptation> = writable(defaultAdaptation);

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
  return get(sequenceAdaptation).globals ?? [];
}

export function setSequenceAdaptation(newSequenceAdaptation: ISequenceAdaptation | undefined): void {
  sequenceAdaptation.set({
    argDelegator: newSequenceAdaptation?.argDelegator ?? defaultAdaptation.argDelegator,
    autoComplete: newSequenceAdaptation?.autoComplete ?? defaultAdaptation.autoComplete,
    autoIndent: newSequenceAdaptation?.autoIndent ?? defaultAdaptation.autoIndent,
    conditionalKeywords: {
      else: newSequenceAdaptation?.conditionalKeywords?.else ?? defaultAdaptation.conditionalKeywords.else,
      elseIf: newSequenceAdaptation?.conditionalKeywords?.elseIf ?? defaultAdaptation.conditionalKeywords.elseIf,
      endIf: newSequenceAdaptation?.conditionalKeywords?.endIf ?? defaultAdaptation.conditionalKeywords.endIf,
      if: newSequenceAdaptation?.conditionalKeywords?.if ?? defaultAdaptation.conditionalKeywords.if,
    },
    globals: newSequenceAdaptation?.globals ?? defaultAdaptation.globals,
    inputFormat: {
      linter: newSequenceAdaptation?.inputFormat?.linter ?? defaultAdaptation.inputFormat.linter,
      name: newSequenceAdaptation?.inputFormat?.name ?? defaultAdaptation.inputFormat.name,
      toInputFormat: newSequenceAdaptation?.inputFormat?.toInputFormat ?? defaultAdaptation.inputFormat.toInputFormat,
    },
    loopKeywords: {
      break: newSequenceAdaptation?.loopKeywords?.break ?? defaultAdaptation.loopKeywords.break,
      continue: newSequenceAdaptation?.loopKeywords?.continue ?? defaultAdaptation.loopKeywords.continue,
      endWhileLoop: newSequenceAdaptation?.loopKeywords?.endWhileLoop ?? defaultAdaptation.loopKeywords.endWhileLoop,
      whileLoop: newSequenceAdaptation?.loopKeywords?.whileLoop ?? defaultAdaptation.loopKeywords.whileLoop,
    },
    modifyOutput: newSequenceAdaptation?.modifyOutput ?? defaultAdaptation.modifyOutput,
    modifyOutputParse: newSequenceAdaptation?.modifyOutputParse ?? defaultAdaptation.modifyOutputParse,
    outputFormat: newSequenceAdaptation?.outputFormat ?? defaultAdaptation.outputFormat,
  });
}
