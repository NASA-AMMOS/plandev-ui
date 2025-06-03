import { foldService, syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import {
  RULE_ELSE,
  RULE_ELSE_IF,
  RULE_END_FOR,
  RULE_END_IF,
  RULE_END_WHILE,
  RULE_FOR,
  RULE_IF,
  RULE_TIME_TAGGED_STATEMENT,
  RULE_WHILE,
} from './vml-constants';

type BlockStackNode = Readonly<{
  node: SyntaxNode;
  stem: string;
}>;

type BlockStack = BlockStackNode[];

export type PairedCommands = {
  end: SyntaxNode;
  endPos: number;
  start: SyntaxNode;
  startPos: number;
};

type PartialPairedCommands = Partial<PairedCommands>;

type TreeState = {
  [startPos: number]: PartialPairedCommands;
};

export function isPairedCommands(pair: unknown): pair is PairedCommands {
  const pc = pair as PairedCommands;
  return !!pc?.start && !!pc?.end;
}

const blocksForState = new WeakMap<EditorState, TreeState>();

const blockOpeningStems: Set<string> = new Set([RULE_IF, RULE_ELSE_IF, RULE_ELSE, RULE_WHILE, RULE_FOR]);

const blockClosingStems: Set<string> = new Set([RULE_ELSE, RULE_ELSE_IF, RULE_END_IF, RULE_END_WHILE, RULE_END_FOR]);

export function isBlockCommand(stem: string): boolean {
  return blockOpeningStems.has(stem) || blockClosingStems.has(stem);
}

function closesBlock(stem: string, blockStem: string): boolean {
  switch (stem) {
    case RULE_END_IF:
      return [RULE_IF, RULE_ELSE_IF, RULE_ELSE].includes(blockStem);
    case RULE_ELSE:
    case RULE_ELSE_IF:
      return [RULE_IF, RULE_ELSE_IF].includes(blockStem);
    case RULE_END_WHILE:
      return blockStem === RULE_WHILE;
    case RULE_END_FOR:
      return blockStem === RULE_FOR;
  }
  return false;
}

export function computeBlocks(state: EditorState): TreeState {
  // avoid scanning for each command
  const blocks = blocksForState.get(state);
  if (!blocks) {
    // find all command nodes in sequence
    const statementAndCategory: [SyntaxNode, string][] = [];
    syntaxTree(state).iterate({
      enter: node => {
        if (node.name === RULE_TIME_TAGGED_STATEMENT) {
          const statementCategory = node.node.firstChild?.nextSibling?.firstChild?.name;
          if (statementCategory && isBlockCommand(statementCategory)) {
            statementAndCategory.push([node.node, statementCategory]);
          }
        }
      },
    });

    // console.log(`statementAndCategory: ${statementAndCategory.length}`);

    const treeState: TreeState = {};
    const stack: BlockStack = [];
    const docString = state.sliceDoc();

    statementAndCategory.forEach(([node, category]) => {
      // const stem = state.sliceDoc(stemNode.from, stemNode.to);
      const topStem = stack.at(-1)?.stem;

      if (topStem && closesBlock(category, topStem)) {
        // close current block
        const blockInfo: BlockStackNode | undefined = stack.pop();
        if (blockInfo) {
          // pair end with existing start to provide info for fold region
          const commandStr = state.toText(docString).lineAt(node.from).text;
          const leadingSpaces = commandStr.length - commandStr.trimStart().length;
          const endPos: undefined | number = node.from - leadingSpaces - 1;
          Object.assign(treeState[blockInfo.node.from], { end: node, endPos });
        }
      } else if (blockClosingStems.has(category)) {
        // unexpected close
        treeState[node.from] = {
          end: node,
        };
        return; // don't open a new block for else_if type
      }

      if (blockOpeningStems.has(category)) {
        // open new block

        // Time_tagged_statement -> Statement
        // Statement -> Statement-subtype (If/Else_if/Else....)  notably exclude Endlines
        // Statement-subtype -> last token
        const startPos = (node.getChild('Statement')?.firstChild?.lastChild ?? node).to;
        // const startPos = (node.lastChild?.firstChild?.lastChild ?? node).to;

        treeState[node.from] = {
          start: node,
          startPos,
        };

        stack.push({
          node,
          stem: category,
        });
      }
    });

    blocksForState.set(state, treeState);
  }
  return blocksForState.get(state)!;
}

export const vmlBlockFolder = foldService.of(
  (state: EditorState, start: number, end: number): null | { from: number; to: number } => {
    const blocks = computeBlocks(state);
    for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(end, -1); node; node = node.parent) {
      if (node.from < start) {
        break;
      }

      const block = blocks[start];
      if (block?.startPos !== undefined && block?.endPos !== undefined) {
        return {
          from: block.startPos,
          to: block.endPos,
        };
      }
    }

    return null;
  },
);
