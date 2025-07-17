import { seqJsonToSeqn, seqnToSeqJson } from '@nasa-jpl/aerie-sequence-languages';
import type { ISequenceAdaptation } from '../../types/sequencing';

// To avoid issues with defaultSequenceAdaptation being referenced before declaration,
// use function declarations for sequenceAutoIndent and sequenceCompletion imports.
// This ensures they are hoisted and available even if defaultSequenceAdaptation is referenced early.

import { sequenceAutoIndent } from './sequence-autoindent';
import { sequenceCompletion } from './sequence-completion';

export function getDefaultSequenceAdaptation(): ISequenceAdaptation {
  return {
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
}
