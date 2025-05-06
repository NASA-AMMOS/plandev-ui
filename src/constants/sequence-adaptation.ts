import type { ISequenceAdaptation } from '../types/sequencing';
import { seqJsonToSequence } from '../utilities/sequence-editor/from-seq-json';
import { sequenceAutoIndent } from '../utilities/sequence-editor/sequence-autoindent';
import { sequenceCompletion } from '../utilities/sequence-editor/sequence-completion';
import { sequenceToSeqJson } from '../utilities/sequence-editor/to-seq-json';

export const defaultSequenceAdaptation: ISequenceAdaptation = {
  argDelegator: undefined,
  autoComplete: sequenceCompletion,
  autoIndent: sequenceAutoIndent,
  globals: [],
  inputFormat: {
    linter: undefined,
    name: 'SeqN',
    toInputFormat: async input => seqJsonToSequence(JSON.parse(input)),
  },
  modifyOutput: undefined,
  modifyOutputParse: undefined,
  outputFormat: [
    {
      fileExtension: 'json',
      name: 'Seq JSON',
      toOutputFormat: async (...args: Parameters<typeof sequenceToSeqJson>) =>
        JSON.stringify(sequenceToSeqJson(...args), null, 2),
    },
  ],
};
