import { CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { LRLanguage, LanguageSupport, foldInside, foldNodeProp, syntaxTree } from '@codemirror/language';
import { Decoration, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import type { ChannelDictionary, CommandDictionary } from '@nasa-jpl/aerie-ampcs';
import type { ISequenceAdaptation } from '../../../../types/sequencing';
import { blockMark } from '../../../codemirror/themes/block';
import { getNearestAncestorNodeOfType } from '../../tree-utils';
import { vmlAutoComplete } from './vml-adaptation';
import {
  RULE_TIME_TAGGED_STATEMENT,
  TOKEN_CALL,
  TOKEN_DO,
  TOKEN_ELSE,
  TOKEN_ELSE_IF,
  TOKEN_END_FOR,
  TOKEN_END_IF,
  TOKEN_END_WHILE,
  TOKEN_EXTERNAL_CALL,
  TOKEN_FOR,
  TOKEN_IF,
  TOKEN_ISSUE,
  TOKEN_SPAWN,
  TOKEN_STEP,
  TOKEN_THEN,
  TOKEN_TO,
  TOKEN_WHILE,
} from './vml-constants';
import { computeBlocks, isBlockCommand, vmlBlockFolder } from './vml-folder';
import { parser } from './vml.grammar';

const VML_LANGUAGE_NAME = 'vml';

const FoldBehavior: {
  [tokenName: string]: (node: SyntaxNode) => ReturnType<typeof foldInside>;
} = {
  // only called on multi-line rules, may need custom service to handle FOR, WHILE, etc.
  Body: foldInside,
  VML_HEADER: foldInside,
};

export const VmlLanguage = LRLanguage.define({
  languageData: {
    commentTokens: { line: ';' },
  },
  name: VML_LANGUAGE_NAME,
  parser: parser.configure({
    props: [
      foldNodeProp.add(FoldBehavior),
      styleTags({
        ABSOLUTE_SEQUENCE: t.macroName,
        ADD: t.arithmeticOperator,
        ASSIGNMENT: t.updateOperator,
        BLOCK: t.namespace,
        BODY: t.namespace,
        Comment: t.comment,
        DAY_TIME_CONST: t.className,
        DECLARE: t.keyword,
        DELAY_BY: t.keyword,
        DIVIDE: t.arithmeticOperator,
        DOUBLE_CONST: t.number,
        END_BODY: t.namespace,
        END_MODULE: t.namespace,
        EXTERNAL_CALL: t.controlKeyword,
        FLAGS: t.namespace,
        FULL_TIME_CONST: t.className,
        HEX_CONST: t.number,
        INPUT: t.keyword,
        INT_CONST: t.number,
        ISSUE: t.controlKeyword,
        ISSUE_DYNAMIC: t.controlKeyword,
        MODULE: t.namespace,
        MODULO: t.arithmeticOperator,
        MULTIPLY: t.arithmeticOperator,
        POWER: t.arithmeticOperator,
        RELATIVE_SEQUENCE: t.macroName,
        RETURN: t.keyword,
        SEQUENCE: t.macroName,
        SHORT_TIME_CONST: t.className,
        SPACECRAFT_TIME_CONST: t.className,
        SPAWN: t.controlKeyword,
        STRING_CONST: t.string,
        SUBTRACT: t.arithmeticOperator,
        TIMEOUT: t.keyword,
        UINT_CONST: t.number,
        VML_EOF: t.docComment,
        VML_HEADER: t.docComment,
        Variable_name: t.variableName,
        WAIT: t.keyword,
        ...Object.fromEntries(
          [
            TOKEN_EXTERNAL_CALL,
            TOKEN_CALL,
            TOKEN_SPAWN,
            TOKEN_ISSUE,
            // conditionals
            TOKEN_IF,
            TOKEN_THEN,
            TOKEN_ELSE_IF,
            TOKEN_ELSE,
            TOKEN_END_IF,
            // for
            TOKEN_FOR,
            TOKEN_TO,
            TOKEN_STEP,
            TOKEN_DO,
            TOKEN_END_FOR,
            // while
            TOKEN_WHILE,
            TOKEN_END_WHILE,
          ].map(token => [token, t.controlKeyword]),
        ),
      }),
    ],
  }),
});

export function setupVmlLanguageSupport(
  autocomplete?: (context: CompletionContext) => CompletionResult | null,
): LanguageSupport {
  if (autocomplete) {
    const autocompleteExtension = VmlLanguage.data.of({ autocomplete });
    return new LanguageSupport(VmlLanguage, [vmlBlockFolder, autocompleteExtension]);
  } else {
    return new LanguageSupport(VmlLanguage, [vmlBlockFolder]);
  }
}

export const vmlAdaptation: ISequenceAdaptation = {
  argDelegator: undefined,
  autoComplete: (_channelDictionary: ChannelDictionary | null, commandDictionary: CommandDictionary | null) =>
    vmlAutoComplete(commandDictionary, [], {}),
  inputFormat: {
    linter: undefined,
    name: VML_LANGUAGE_NAME,
    toInputFormat: (vml: string) => Promise.resolve(vml),
  },
  modifyOutput: undefined,
  modifyOutputParse: undefined,
  // vml input and output are identical
  outputFormat: [],
};

function timeTaggedToKeyword(node: SyntaxNode | undefined | null): SyntaxNode | undefined {
  return node?.firstChild?.nextSibling?.firstChild?.firstChild ?? undefined;
}

export function vmlHighlightBlock(viewUpdate: ViewUpdate): SyntaxNode[] {
  const tree = syntaxTree(viewUpdate.state);
  const selectionLine = viewUpdate.state.doc.lineAt(viewUpdate.state.selection.asSingle().main.from);
  const leadingWhiteSpaceLength = selectionLine.text.length - selectionLine.text.trimStart().length;
  const updatedSelectionNode = tree.resolveInner(selectionLine.from + leadingWhiteSpaceLength, 1);
  // walk up the tree to Time_tagged_statement, and then back down to the block command e.g. "ELSE"
  const timeTaggedNode = getNearestAncestorNodeOfType(updatedSelectionNode, [RULE_TIME_TAGGED_STATEMENT]) ?? undefined;

  const keywordNode = timeTaggedToKeyword(timeTaggedNode);
  if (!keywordNode || !keywordNode.parent || !isBlockCommand(keywordNode.parent?.name)) {
    return [];
  }

  const blocks = computeBlocks(viewUpdate.state);
  const pairs = Object.values(blocks);
  const matchedNodes: SyntaxNode[] = [keywordNode];

  // when cursor on end -- select else and if
  let current: SyntaxNode | undefined = timeTaggedNode;
  while (current) {
    current = pairs.find(block => block.end?.from === current!.from)?.start;
    const pairedStemToken = timeTaggedToKeyword(current);
    if (pairedStemToken) {
      matchedNodes.push(pairedStemToken);
    }
  }

  // when cursor on if -- select else and end
  current = timeTaggedNode;
  while (current) {
    current = pairs.find(block => block.start?.from === current!.from)?.end;
    const pairedStemToken = timeTaggedToKeyword(current);
    if (pairedStemToken) {
      matchedNodes.push(pairedStemToken);
    }
  }

  return matchedNodes;
}

export const vmlBlockHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor() {
      this.decorations = Decoration.none;
    }
    update(viewUpdate: ViewUpdate): DecorationSet | null {
      if (viewUpdate.selectionSet || viewUpdate.docChanged || viewUpdate.viewportChanged) {
        const blocks = vmlHighlightBlock(viewUpdate);
        this.decorations = Decoration.set(
          // codemirror requires marks to be in sorted order
          blocks.sort((a, b) => a.from - b.from).map(block => blockMark.range(block.from, block.to)),
        );
        return this.decorations;
      }
      return null;
    }
  },
  {
    decorations: viewPluginSpecification => viewPluginSpecification.decorations,
  },
);
