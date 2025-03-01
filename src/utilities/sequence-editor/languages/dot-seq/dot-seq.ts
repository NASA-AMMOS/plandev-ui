import { LRLanguage } from '@codemirror/language';
import { parser } from './dot-seq.grammar';

const SEQ_DOT_TEXT = '.seq';

export const SeqDotTextLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: ';' },
  },
  name: SEQ_DOT_TEXT,
  parser: parser.configure({
    props: [],
  }),
});
