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

export const outputFormat = derived([sequenceAdaptation], ([$sequenceAdaptation]) => $sequenceAdaptation?.outputFormat);

/* Helpers */

export function getGlobals(): GlobalType[] {
  return get(sequenceAdaptation)?.globals ?? [];
}

export function setSequenceAdaptation(): void {
  sequenceAdaptation.set({
    argDelegator: globalThis.SequenceAdaptation?.ARG_DELEGATOR ?? undefined,
    conditionalKeywords: {
      else: globalThis.SequenceAdaptation?.CONDITIONAL_KEYWORDS?.ELSE ?? 'CMD_ELSE',
      elseIf: globalThis.SequenceAdaptation?.CONDITIONAL_KEYWORDS?.ELSE_IF ?? ['CMD_ELSE_IF'],
      endIf: globalThis.SequenceAdaptation?.CONDITIONAL_KEYWORDS?.END_IF ?? 'CMD_END_IF',
      if: globalThis.SequenceAdaptation?.CONDITIONAL_KEYWORDS?.IF ?? ['CMD_IF'],
    },
    globals: globalThis.SequenceAdaptation?.GLOBALS ?? [],
    inputFormat: {
      linter: globalThis.SequenceAdaptation?.INPUT_FORMAT?.LINTER ?? undefined,
      name: globalThis.SequenceAdaptation?.INPUT_FORMAT?.NAME ?? 'SeqN',
      toInputFormat: globalThis.SequenceAdaptation?.INPUT_FORMAT?.TO_INPUT_FORMAT ?? seqJsonToSequence,
    },
    loopKeywords: {
      break: globalThis.SequenceAdaptation?.LOOP_KEYWORDS?.BREAK ?? 'CMD_BREAK',
      continue: globalThis.SequenceAdaptation?.LOOP_KEYWORDS?.CONTINUE ?? 'CMD_CONTINUE',
      endWhileLoop: globalThis.SequenceAdaptation?.LOOP_KEYWORDS?.END_WHILE_LOOP ?? 'CMD_END_WHILE_LOOP',
      whileLoop: globalThis.SequenceAdaptation?.LOOP_KEYWORDS?.WHILE_LOOP ?? ['CMD_WHILE_LOOP', 'CMD_WHILE_LOOP_OR'],
    },
    modifyOutput: globalThis.SequenceAdaptation?.MODIFY_OUTPUT ?? undefined,
    modifyOutputParse: globalThis.SequenceAdaptation?.MODIFY_OUTPUT_PARSE ?? undefined,
    outputFormat: {
      linter: globalThis.SequenceAdaptation?.OUTPUT_FORMAT?.LINTER ?? undefined,
      name: globalThis.SequenceAdaptation?.OUTPUT_FORMAT?.NAME ?? 'Seq JSON',
      toOutputFormat: globalThis.SequenceAdaptation?.OUTPUT_FORMAT?.TO_OUTPUT_FORMAT ?? sequenceToSeqJson,
    },
  });
}
