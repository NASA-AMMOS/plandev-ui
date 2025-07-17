import { derived, get, writable, type Writable } from 'svelte/store';
import type { GlobalType } from '../types/global-type';
import type { ISequenceAdaptation, SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { getDefaultSequenceAdaptation } from '../utilities/sequence-editor/sequence-adaptation';
import { gqlSubscribable } from './subscribable';

const defaultSequenceAdaptation = getDefaultSequenceAdaptation();

/* Writeable */

export const sequenceAdaptation: Writable<ISequenceAdaptation> = writable(defaultSequenceAdaptation);

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

export const adaptationGlobals = derived(
  [sequenceAdaptation],
  ([$sequenceAdaptation]) => $sequenceAdaptation.globals ?? [],
);

/* Helpers */

export function getGlobals(): GlobalType[] {
  return get(sequenceAdaptation).globals ?? [];
}

export function setSequenceAdaptation(newSequenceAdaptation: Partial<ISequenceAdaptation> | undefined): void {
  sequenceAdaptation.set({
    argDelegator: newSequenceAdaptation?.argDelegator ?? defaultSequenceAdaptation.argDelegator,
    autoComplete: newSequenceAdaptation?.autoComplete ?? defaultSequenceAdaptation.autoComplete,
    autoIndent: newSequenceAdaptation?.autoIndent ?? defaultSequenceAdaptation.autoIndent,
    globals: newSequenceAdaptation?.globals ?? defaultSequenceAdaptation.globals,
    inputFormat: {
      linter: newSequenceAdaptation?.inputFormat?.linter ?? defaultSequenceAdaptation.inputFormat.linter,
      name: newSequenceAdaptation?.inputFormat?.name ?? defaultSequenceAdaptation.inputFormat.name,
      toInputFormat:
        newSequenceAdaptation?.inputFormat?.toInputFormat ?? defaultSequenceAdaptation.inputFormat.toInputFormat,
    },
    modifyOutput: newSequenceAdaptation?.modifyOutput ?? defaultSequenceAdaptation.modifyOutput,
    modifyOutputParse: newSequenceAdaptation?.modifyOutputParse ?? defaultSequenceAdaptation.modifyOutputParse,
    outputFormat: newSequenceAdaptation?.outputFormat ?? defaultSequenceAdaptation.outputFormat,
  });
}
