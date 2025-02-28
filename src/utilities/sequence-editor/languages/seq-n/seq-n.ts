import { CompletionContext, completeFromList, type CompletionResult } from '@codemirror/autocomplete';
import { LRLanguage, LanguageSupport, delimitedIndent, foldNodeProp, indentNodeProp } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import { handlebarsLanguage } from "@xiechao/codemirror-lang-handlebars";
import { customFoldInside } from './custom-folder';
import { parser } from './seq-n.grammar';

export const SeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({ align: false, closing: ')' }),
      }),
      foldNodeProp.add({
        Activate: customFoldInside,
        Command: customFoldInside,
        GroundBlock: customFoldInside,
        GroundEvent: customFoldInside,
        Load: customFoldInside,
        LocalDeclaration: customFoldInside,
        Metadata: customFoldInside,
        Models: customFoldInside,
        ParameterDeclaration: customFoldInside,
        Request: customFoldInside,
      }),
      styleTags({
        Activate: t.namespace,
        Boolean: t.bool,
        Engine: t.namespace,
        Epoch: t.namespace,
        GenericDirective: t.namespace,
        Global: t.namespace,
        GroundBlock: t.namespace,
        GroundEpoch: t.className,
        GroundEvent: t.namespace,
        HardwareCommands: t.namespace,
        IdDeclaration: t.namespace,
        ImmediateCommands: t.namespace,
        LineComment: t.comment,
        Load: t.namespace,
        LoadAndGoDirective: t.namespace,
        LocalDeclaration: t.namespace,
        MetaEntry: t.namespace,
        Model: t.namespace,
        Note: t.namespace,
        ParameterDeclaration: t.namespace,
        Request: t.namespace,
        Stem: t.keyword,
        String: t.string,
        TimeAbsolute: t.className,
        TimeBlockRelative: t.className,
        TimeComplete: t.className,
        TimeEpoch: t.className,
        TimeGroundEpoch: t.className,
        TimeRelative: t.className,
      }),
    ],
  })
});

export const HandlebarsOverSeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser: handlebarsLanguage.parser.configure({
    wrap: parseMixed(node => {
      return node.type.isTop ? {
        parser: SeqLanguage.parser,
        overlay: node => node.type.name == "Text"
      } : null
    })
  }),
});

const handlebarsFunctions = [
  "handlefoos",
  "handlebars",
  "handlebazs"
]

export function setupLanguageSupport(autocomplete?: (context: CompletionContext) => CompletionResult | null) {
  if (autocomplete) {
    return new LanguageSupport(HandlebarsOverSeqLanguage, [SeqLanguage.data.of({ autocomplete }), handlebarsLanguage.extension, HandlebarsOverSeqLanguage.data.of({ 'autocomplete': completeFromList(handlebarsFunctions) })]);
  } else {
    return new LanguageSupport(HandlebarsOverSeqLanguage);
  }
}
