import { seqJsonToSeqn, seqnToSeqJson } from '@nasa-jpl/aerie-sequence-languages';
import type { ISequenceAdaptation } from '../language-package/interfaces/legacy';
import { sequenceAutoIndent } from '../language-package/languages/seq-n/sequence-autoindent';
import { sequenceCompletion } from '../language-package/languages/seq-n/sequence-completion';

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
  outputFormat: {
    fileExtension: 'json',
    name: 'Seq JSON',
    toOutputFormat: async (...args: Parameters<typeof seqnToSeqJson>) =>
      JSON.stringify(seqnToSeqJson(...args), null, 2),
  },
};
