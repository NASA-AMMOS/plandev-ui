import { derived, writable, type Writable } from 'svelte/store';
import { defaultSequenceAdaptation } from '../constants/sequence-adaptation';
import type { ISequenceAdaptation } from '../language-package/interfaces/legacy';
import type { NewAdaptationInterface } from '../language-package/interfaces/new-adaptation-interface';
import { defaultAdaptation as defaultNewAdaptation } from '../language-package/languages/seq-n/adaptation';
import type { SequenceAdaptationMetadata } from '../types/sequencing';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writeable */

export const sequenceAdaptation: Writable<ISequenceAdaptation> = writable(defaultSequenceAdaptation);
export const newSequenceAdaptation: Writable<NewAdaptationInterface> = writable(defaultNewAdaptation);

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

export function setSequenceAdaptation(newSequenceAdaptation: Partial<ISequenceAdaptation> | undefined): void {
  // TODO boo
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
