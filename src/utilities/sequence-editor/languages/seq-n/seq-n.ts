import { CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { LRLanguage, LanguageSupport, delimitedIndent, foldNodeProp, indentNodeProp } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { SeqnParser } from '@nasa-jpl/aerie-sequence-languages';
import { customFoldInside } from './custom-folder';

export const SeqLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: '#' },
  },
  parser: SeqnParser.configure({
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
  }),
});

export function setupLanguageSupport(autocomplete?: (context: CompletionContext) => CompletionResult | null) {
  if (autocomplete) {
    const autocompleteExtension = SeqLanguage.data.of({ autocomplete });
    return new LanguageSupport(SeqLanguage, [autocompleteExtension]);
  } else {
    return new LanguageSupport(SeqLanguage);
  }
}
