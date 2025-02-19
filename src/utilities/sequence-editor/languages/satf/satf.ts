import { LRLanguage, LanguageSupport, foldNodeProp } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { parser } from '../satf/satf-sasf.grammar';

export const SatfLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser: parser.configure({
    props: [
      foldNodeProp.add({
        // TODO: Add a custom folder
      }),
      styleTags({
        Activity: t.strong,
        ActivityTypeCode: t.namespace,
        ActivityTypeGroup: t.keyword,
        ActivityTypeName: t.namespace,
        Assignment: t.strong,
        Boolean: t.bool,
        Command: t.strong,
        CommandDynamic: t.strong,
        CommandsDynamic: t.strong,
        Comment: t.comment,
        Data: t.comment,
        Enum: t.url,
        Ground: t.strong,
        HeaderPair: t.namespace,
        HeaderRecord: t.comment,
        Keyword: t.comment,
        LineSeparator: t.comment,
        Loop: t.strong,
        Name: t.strong,
        Note: t.strong,
        Number: t.number,
        Parameters: t.keyword,
        Request: t.keyword,
        SatfComment: t.comment,
        SeqTranDirective: t.keyword,
        SeqTranSet: t.keyword,
        SeqgenDirective: t.keyword,
        Stem: t.keyword,
        StepLabel: t.number,
        String: t.string,
        Type: t.keyword,
        TypeGroup: t.keyword,
        TypeName: t.strong,
        Value: t.namespace,
        Variables: t.keyword,
      }),
    ],
  }),
});

export function setupSatfLanguageSupport() {
  return new LanguageSupport(SatfLanguage);
}
