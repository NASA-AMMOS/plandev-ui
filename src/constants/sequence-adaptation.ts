import { seqJsonToSeqn, seqnToSeqJson } from '@nasa-jpl/aerie-sequence-languages';
import type { ISequenceAdaptation } from '../types/sequencing';
import { sequenceAutoIndent } from '../utilities/sequence-editor/sequence-autoindent';
import { sequenceCompletion } from '../utilities/sequence-editor/sequence-completion';

export const defaultSequenceAdaptation: ISequenceAdaptation = {
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
