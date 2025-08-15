import { CompletionContext, completeFromList, type CompletionResult } from '@codemirror/autocomplete';
import { LRLanguage, LanguageSupport } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { handlebarsLanguage } from '../handlebars/handlebars';
import { SeqLanguage } from '../seq-n/seq-n';

export const HandlebarsOverSeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser: handlebarsLanguage.parser.configure({
    wrap: parseMixed(node => {
      return node.type.isTop
        ? {
            overlay: node => node.type.name === 'Text',
            parser: SeqLanguage.parser, // TODO: We need to get the correct parser from the sequence adaptation somehow...
          }
        : null;
    }),
  }),
});

const handlebarsCompletions = [
  // Helpers
  'add-time',
  'subtract-time',
  'flatten',
  'formatAsDate',
  // Args
  'startTime',
];

export function setupLanguageSupport(autocomplete?: (context: CompletionContext) => CompletionResult | null) {
  if (autocomplete) {
    return new LanguageSupport(HandlebarsOverSeqLanguage, [
      SeqLanguage.data.of({ autocomplete }),
      handlebarsLanguage.extension,
      HandlebarsOverSeqLanguage.data.of({ autocomplete: completeFromList(handlebarsCompletions) }),
    ]);
  } else {
    return new LanguageSupport(HandlebarsOverSeqLanguage);
  }
}
