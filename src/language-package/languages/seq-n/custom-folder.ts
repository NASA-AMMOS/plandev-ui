import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { SEQN_NODES } from '@nasa-jpl/aerie-sequence-languages';
import { getFromAndTo } from '../../../utilities/sequence-editor/tree-utils';

export function customFoldInside(node: SyntaxNode, state: EditorState): { from: number; to: number } | null {
  switch (node.name) {
    case SEQN_NODES.ACTIVATE:
    case SEQN_NODES.LOAD:
      return foldSteps(node, SEQN_NODES.SEQUENCE_NAME, state);
    case SEQN_NODES.COMMAND:
      return foldSteps(node, SEQN_NODES.STEM, state);
    case SEQN_NODES.GROUND_BLOCK:
    case SEQN_NODES.GROUND_EVENT:
      return foldSteps(node, SEQN_NODES.GROUND_NAME, state);
    case SEQN_NODES.REQUEST:
      return foldRequest(node, state);
    case SEQN_NODES.METADATA:
      return foldMetadataOrModel(node, state, '@Metadata');
    case SEQN_NODES.MODELS:
      return foldMetadataOrModel(node, state, '@Model');
    case SEQN_NODES.PARAMETER_DECLARATION:
    case SEQN_NODES.LOCAL_DECLARATION:
      return foldVariables(node, state);
  }
  return null;
}
/**
 * Returns a fold range object for a Command, Load, or Ground block.
 * The fold range starts after the target node (Stem or SequenceName)
 * and ends after any Args, LineComment, Metadata, Models, Epoch, and Engine nodes.
 * If the text ends with a line break, the end of the fold range will be adjusted to the start of the line break.
 *
 * @param containerNode - The parent node of the target node.
 * @param nodeName - The node to start the fold range after (Stem or SequenceName).
 * @param state - The EditorState object.
 * @returns A fold range object with "from" and "to" properties.
 *          Returns null if any of the necessary nodes are not present.
 */
export function foldSteps(
  containerNode: SyntaxNode,
  nodeName: 'Stem' | 'SequenceName' | 'GroundName',
  state: EditorState,
): { from: number; to: number } | null {
  const node = containerNode.getChild(nodeName);
  // If the node is missing, return null
  if (node == null) {
    return null;
  }

  if (nodeName === SEQN_NODES.STEM) {
    const blockFold = blockFolder(node, state);
    if (blockFold) {
      return blockFold;
    }
  }

  // Get all Args nodes, LineComment node, Metadata nodes, and Models nodes.
  const argsNodes = containerNode.getChildren(SEQN_NODES.ARGS);
  const commentNode = containerNode.getChild(SEQN_NODES.LINE_COMMENT);
  const metadataNode = containerNode.getChildren(SEQN_NODES.METADATA);
  const modelNodes = containerNode.getChildren(SEQN_NODES.MODELS);

  // Get the Epoch and Engine nodes.
  const epochNode = containerNode.getChild(SEQN_NODES.EPOCH);
  const engineNode = containerNode.getChild(SEQN_NODES.ENGINE);

  // Calculate the start of the fold range after the target node and any Args, LineComment nodes
  const from = getFromAndTo([node, ...argsNodes, commentNode]).to;

  // Calculate the end of the fold range after the Epoch, Engine, Metadata, and Model nodes.
  const groundAttributesEnd = getFromAndTo([epochNode, engineNode, ...metadataNode, ...modelNodes]).to;

  // Get the text between the start and end of the fold range.
  const text = state.sliceDoc(from, groundAttributesEnd).trimEnd() + '\n';

  // Calculate the end of the fold range by finding the index of the last line break in the text.
  const to = from + text.lastIndexOf('\n');

  return { from, to };
}

/**
 * Calculate the fold range for a Request node.
 * The fold range starts after the RequestName node and any LineComment node
 * and ends after the Request node.
 * If the text ends with a line break, the end of the fold range will be adjusted to the start of the line break.
 *
 * @param requestNode - The Request node to calculate the fold range for.
 * @param state - The EditorState object.
 * @returns A fold range object with "from" and "to" properties.
 *          Returns null if any of the necessary nodes are not present.
 */
export function foldRequest(requestNode: SyntaxNode, state: EditorState): { from: number; to: number } | null {
  const requestNameNode = requestNode.getChild(SEQN_NODES.REQUEST_NAME);
  const argsNodes = requestNode.getChildren(SEQN_NODES.ARGS);
  const commentNode = requestNode.getChild(SEQN_NODES.LINE_COMMENT);

  // Calculate the start of the fold range after the RequestName node and any LineComment node
  const from = getFromAndTo([requestNameNode, ...argsNodes, commentNode]).to + (commentNode == null ? 1 : 0);

  // Calculate the end of the fold range after the Request node
  let endRequest = getFromAndTo([requestNode]).to;

  // If the text ends with a line break, adjust the end of the fold range to the start of the line break
  const text = state.sliceDoc(from, endRequest).trimEnd() + '\n';
  endRequest = from + text.lastIndexOf('\n');

  return { from, to: endRequest };
}

/**
 * Calculate the fold range for a block of variables.
 * The fold range starts after the prefix of the block (e.g. "@INPUT_PARAMETERS_BEGIN" or "@LOCALS_BEGIN")
 * and ends of the block.
 * If the text ends with a line break, the end of the fold range will be adjusted to the start of the line break.
 *
 * @param containerNode - The node containing the variables (e.g. ParameterDeclaration or LocalDeclaration).
 * @param state - The EditorState object.
 * @returns A fold range object with "from" and "to" properties.
 *          Returns null if any of the necessary nodes are not present.
 */
export function foldVariables(containerNode: SyntaxNode, state: EditorState): { from: number; to: number } | null {
  // Get all the Variable nodes in the container node
  const variablesNodes = containerNode.getChildren(SEQN_NODES.VARIABLE);

  // Calculate the length of the directive (e.g. "@INPUT_PARAMETERS_BEGIN" or "@LOCALS_BEGIN")
  const directiveLength = state
    .sliceDoc(
      containerNode.from,
      containerNode.to - (variablesNodes.length > 0 ? getFromAndTo([...variablesNodes]).from : 0),
    )
    .split('\n')[0].length;

  // Calculate the start of the fold range after the directive
  const from = containerNode.from + directiveLength;

  // Calculate the end of the fold range after the last Variable node
  let endBlock = getFromAndTo([containerNode]).to;

  // If the text ends with a line break, adjust the end of the fold range to the start of the line break
  const text = state.sliceDoc(containerNode.from + directiveLength, endBlock).trimEnd() + '\n';
  endBlock = from + text.lastIndexOf('\n');

  return { from, to: endBlock };
}

/**
 * Calculate the fold range for a Metadata or Model node.
 * The fold range starts after the node's prefix (e.g. "@Metadata" or "@Model") and ends after the node.
 * If the text ends with a line break, the end of the fold range will be adjusted to the start of the line break.
 *
 * @param node - The Metadata or Model node to calculate the fold range for.
 * @param state - The EditorState object.
 * @param prefix - The prefix of the node (e.g. "@Metadata" or "@Model").
 * @returns A fold range object with "from" and "to" properties.
 *          Returns null if the node is not present.
 */
function foldMetadataOrModel(
  node: SyntaxNode,
  state: EditorState,
  prefix: string,
): { from: number; to: number } | null {
  if (node === null) {
    return null;
  }

  const { from: start, to: end } = getFromAndTo([node]);

  // If the text ends with a line break, adjust the end of the fold range to the start of the line break
  const text = state.sliceDoc(start, end).trimEnd() + '\n';
  const newEnd = start + text.lastIndexOf('\n');

  return {
    from: start + prefix.length,
    to: newEnd,
  };
}

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

type BlockType = Readonly<{
  close: string;
  open: string[];
  partition?: string;
}>;

const SEQ_DIR_END_IF = 'SEQ_DIR_END_IF';
const SEQ_DIR_IF = 'SEQ_DIR_IF';
const SEQ_DIR_IF_OR = 'SEQ_DIR_IF_OR';
const SEQ_DIR_IF_AND = 'SEQ_DIR_IF_AND';
const SEQ_DIR_ELSE = 'SEQ_DIR_ELSE';
const SEQ_DIR_END_WAIT_UNTIL = 'SEQ_DIR_END_WAIT_UNTIL';
const SEQ_DIR_WAIT_UNTIL = 'SEQ_DIR_WAIT_UNTIL';
const SEQ_DIR_WAIT_UNTIL_VAR = 'SEQ_DIR_WAIT_UNTIL_VAR';
const SEQ_DIR_WAIT_UNTIL_AND = 'SEQ_DIR_WAIT_UNTIL_AND';
const SEQ_DIR_WAIT_UNTIL_OR = 'SEQ_DIR_WAIT_UNTIL_OR';
const SEQ_DIR_WAIT_UNTIL_TIMEOUT = 'SEQ_DIR_WAIT_UNTIL_TIMEOUT';
const SEQ_DIR_END_LOOP = 'SEQ_DIR_END_LOOP';
const SEQ_DIR_LOOP = 'SEQ_DIR_LOOP';
const SEQ_DIR_WHILE_LOOP = 'SEQ_DIR_WHILE_LOOP';
const SEQ_DIR_WHILE_LOOP_AND = 'SEQ_DIR_WHILE_LOOP_AND';
const SEQ_DIR_WHILE_LOOP_OR = 'SEQ_DIR_WHILE_LOOP_OR';
const SEQ_DIR_END_WHILE_LOOP = 'SEQ_DIR_END_WHILE_LOOP';

// user-friendly versions, move to adaption when hooks are available
const USER_SEQ_DIR_END_IF = 'USER_SEQ_DIR_END_IF';
const USER_SEQ_DIR_IF = 'USER_SEQ_DIR_IF';
const USER_SEQ_DIR_IF_OR = 'USER_SEQ_DIR_IF_OR';
const USER_SEQ_DIR_IF_AND = 'USER_SEQ_DIR_IF_AND';
const USER_SEQ_DIR_ELSE = 'USER_SEQ_DIR_ELSE';
const USER_SEQ_DIR_END_WAIT_UNTIL = 'USER_SEQ_DIR_END_WAIT_UNTIL';
const USER_SEQ_DIR_WAIT_UNTIL = 'USER_SEQ_DIR_WAIT_UNTIL';
const USER_SEQ_DIR_WAIT_UNTIL_VAR = 'USER_SEQ_DIR_WAIT_UNTIL_VAR';
const USER_SEQ_DIR_WAIT_UNTIL_AND = 'USER_SEQ_DIR_WAIT_UNTIL_AND';
const USER_SEQ_DIR_WAIT_UNTIL_OR = 'USER_SEQ_DIR_WAIT_UNTIL_OR';
const USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT = 'USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT';
const USER_SEQ_DIR_END_LOOP = 'USER_SEQ_DIR_END_LOOP';
const USER_SEQ_DIR_LOOP = 'USER_SEQ_DIR_LOOP';
const USER_SEQ_DIR_WHILE_LOOP = 'USER_SEQ_DIR_WHILE_LOOP';
const USER_SEQ_DIR_WHILE_LOOP_AND = 'USER_SEQ_DIR_WHILE_LOOP_AND';
const USER_SEQ_DIR_WHILE_LOOP_OR = 'USER_SEQ_DIR_WHILE_LOOP_OR';
const USER_SEQ_DIR_END_WHILE_LOOP = 'USER_SEQ_DIR_END_WHILE_LOOP';

const BLOCK_TYPES: readonly BlockType[] = [
  {
    close: SEQ_DIR_END_IF,
    open: [SEQ_DIR_IF, SEQ_DIR_IF_OR, SEQ_DIR_IF_AND],
    partition: SEQ_DIR_ELSE,
  },
  {
    close: SEQ_DIR_END_WAIT_UNTIL,
    open: [SEQ_DIR_WAIT_UNTIL, SEQ_DIR_WAIT_UNTIL_VAR, SEQ_DIR_WAIT_UNTIL_AND, SEQ_DIR_WAIT_UNTIL_OR],
    partition: SEQ_DIR_WAIT_UNTIL_TIMEOUT,
  },
  {
    close: SEQ_DIR_END_LOOP,
    open: [SEQ_DIR_LOOP],
  },
  {
    close: SEQ_DIR_END_WHILE_LOOP,
    open: [SEQ_DIR_WHILE_LOOP, SEQ_DIR_WHILE_LOOP_AND, SEQ_DIR_WHILE_LOOP_OR],
  },
  {
    close: USER_SEQ_DIR_END_IF,
    open: [USER_SEQ_DIR_IF, USER_SEQ_DIR_IF_OR, USER_SEQ_DIR_IF_AND],
    partition: USER_SEQ_DIR_ELSE,
  },
  {
    close: USER_SEQ_DIR_END_WAIT_UNTIL,
    open: [
      USER_SEQ_DIR_WAIT_UNTIL,
      USER_SEQ_DIR_WAIT_UNTIL_VAR,
      USER_SEQ_DIR_WAIT_UNTIL_AND,
      USER_SEQ_DIR_WAIT_UNTIL_OR,
    ],
    partition: USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT,
  },
  {
    close: USER_SEQ_DIR_END_LOOP,
    open: [USER_SEQ_DIR_LOOP],
  },
  {
    close: USER_SEQ_DIR_END_WHILE_LOOP,
    open: [USER_SEQ_DIR_WHILE_LOOP, USER_SEQ_DIR_WHILE_LOOP_AND, USER_SEQ_DIR_WHILE_LOOP_OR],
  },
];

const OPEN_SUGGESTION: { [open: string]: string } = Object.fromEntries(
  BLOCK_TYPES.flatMap(blockType => [
    [blockType.close, blockType.open.join(', ')],
    blockType.partition ? [blockType.partition, blockType.open.join(', ')] : [],
  ]),
);

const CLOSE_SUGGESTION: { [open: string]: string } = Object.fromEntries(
  BLOCK_TYPES.flatMap(blockType => [
    ...blockType.open.map(opener => [opener, blockType.close]),
    ...(blockType.partition ? [[blockType.partition, blockType.close]] : []),
  ]),
);

export function closeSuggestion(stem: string): string | undefined {
  return CLOSE_SUGGESTION[stem];
}

export function openSuggestion(stem: string): string | undefined {
  return OPEN_SUGGESTION[stem];
}

const blockOpeningStems: Set<string> = new Set([
  SEQ_DIR_IF,
  SEQ_DIR_IF_OR,
  SEQ_DIR_IF_AND,
  SEQ_DIR_ELSE,
  SEQ_DIR_WAIT_UNTIL,
  SEQ_DIR_WAIT_UNTIL_VAR,
  SEQ_DIR_WAIT_UNTIL_AND,
  SEQ_DIR_WAIT_UNTIL_OR,
  SEQ_DIR_WAIT_UNTIL_TIMEOUT,
  SEQ_DIR_LOOP,
  SEQ_DIR_WHILE_LOOP,
  SEQ_DIR_WHILE_LOOP_AND,
  SEQ_DIR_WHILE_LOOP_OR,

  USER_SEQ_DIR_IF,
  USER_SEQ_DIR_IF_OR,
  USER_SEQ_DIR_IF_AND,
  USER_SEQ_DIR_ELSE,
  USER_SEQ_DIR_WAIT_UNTIL,
  USER_SEQ_DIR_WAIT_UNTIL_VAR,
  USER_SEQ_DIR_WAIT_UNTIL_AND,
  USER_SEQ_DIR_WAIT_UNTIL_OR,
  USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT,
  USER_SEQ_DIR_LOOP,
  USER_SEQ_DIR_WHILE_LOOP,
  USER_SEQ_DIR_WHILE_LOOP_AND,
  USER_SEQ_DIR_WHILE_LOOP_OR,
]);

const blockClosingStems: Set<string> = new Set([
  SEQ_DIR_ELSE, // also opens
  SEQ_DIR_WAIT_UNTIL_TIMEOUT, // also opens

  SEQ_DIR_END_IF,
  SEQ_DIR_END_WAIT_UNTIL,
  SEQ_DIR_END_LOOP,
  SEQ_DIR_END_WHILE_LOOP,

  USER_SEQ_DIR_ELSE, // also opens
  USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT, // also opens

  USER_SEQ_DIR_END_IF,
  USER_SEQ_DIR_END_WAIT_UNTIL,
  USER_SEQ_DIR_END_LOOP,
  USER_SEQ_DIR_END_WHILE_LOOP,
]);

export function isBlockCommand(stem: string): boolean {
  return blockOpeningStems.has(stem) || blockClosingStems.has(stem);
}

function closesBlock(stem: string, blockStem: string): boolean {
  // not the same as `closeSuggestion(blockStem) === stem;` as else types are optional
  switch (stem) {
    case SEQ_DIR_END_IF:
      return blockStem === SEQ_DIR_ELSE || blockStem.startsWith(SEQ_DIR_IF);
    case SEQ_DIR_ELSE:
      return blockStem.startsWith(SEQ_DIR_IF);
    case SEQ_DIR_END_WAIT_UNTIL:
      return blockStem === SEQ_DIR_WAIT_UNTIL_TIMEOUT || blockStem.startsWith(SEQ_DIR_WAIT_UNTIL);
    case SEQ_DIR_WAIT_UNTIL_TIMEOUT:
      return blockStem.startsWith(SEQ_DIR_WAIT_UNTIL);
    case SEQ_DIR_END_LOOP:
      return blockStem === SEQ_DIR_LOOP;
    case SEQ_DIR_END_WHILE_LOOP:
      return blockStem.startsWith(SEQ_DIR_WHILE_LOOP);

    case USER_SEQ_DIR_END_IF:
      return blockStem === USER_SEQ_DIR_ELSE || blockStem.startsWith(USER_SEQ_DIR_IF);
    case USER_SEQ_DIR_ELSE:
      return blockStem.startsWith(USER_SEQ_DIR_IF);
    case USER_SEQ_DIR_END_WAIT_UNTIL:
      return blockStem === USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT || blockStem.startsWith(USER_SEQ_DIR_WAIT_UNTIL);
    case USER_SEQ_DIR_WAIT_UNTIL_TIMEOUT:
      return blockStem.startsWith(USER_SEQ_DIR_WAIT_UNTIL);
    case USER_SEQ_DIR_END_LOOP:
      return blockStem === USER_SEQ_DIR_LOOP;
    case USER_SEQ_DIR_END_WHILE_LOOP:
      return blockStem.startsWith(USER_SEQ_DIR_WHILE_LOOP);
  }
  return false;
}

const blocksForState = new WeakMap<EditorState, TreeState>();

export function computeBlocks(state: EditorState): TreeState {
  // avoid scanning for each command
  const blocks = blocksForState.get(state);
  if (!blocks) {
    // find all command nodes in sequence
    const commandNodes: SyntaxNode[] = [];
    syntaxTree(state).iterate({
      enter: node => {
        if (node.name === SEQN_NODES.COMMAND) {
          const stemNode = node.node.getChild('Stem');
          if (stemNode) {
            commandNodes.push(stemNode);
          }
        }
      },
    });

    const treeState: TreeState = {};
    const stack: BlockStack = [];
    const docString = state.sliceDoc();

    commandNodes
      // filter out ones that don't impact blocks
      .filter(stemNode => isBlockCommand(state.sliceDoc(stemNode.from, stemNode.to)))
      .forEach(stemNode => {
        const stem = state.sliceDoc(stemNode.from, stemNode.to);
        const topStem = stack.at(-1)?.stem;

        if (topStem && closesBlock(stem, topStem)) {
          // close current block
          const blockInfo: BlockStackNode | undefined = stack.pop();
          if (blockInfo) {
            // pair end with existing start to provide info for fold region
            const commandStr = state.toText(docString).lineAt(stemNode.from).text;
            const leadingSpaces = commandStr.length - commandStr.trimStart().length;
            let endPos: undefined | number = undefined;
            if (stemNode.parent) {
              // don't fold up preceding new line and indentation
              endPos = stemNode.parent.from - leadingSpaces - 1;
            }

            Object.assign(treeState[blockInfo.node.from], { end: stemNode, endPos });
          }
        } else if (blockClosingStems.has(stem)) {
          // unexpected close
          treeState[stemNode.from] = {
            end: stemNode,
          };
          return; // don't open a new block for else_if type
        }

        if (blockOpeningStems.has(stem)) {
          // open new block

          let startPos: undefined | number = undefined;
          if (stemNode.parent) {
            const fullCommand = state.sliceDoc(stemNode.parent.from, stemNode.parent.to);
            startPos = stemNode.parent.to - (fullCommand.length - fullCommand.trimEnd().length);
          }
          treeState[stemNode.from] = {
            start: stemNode,
            startPos,
          };

          stack.push({
            node: stemNode,
            stem,
          });
        }
      });
    blocksForState.set(state, treeState);
  }
  return blocksForState.get(state)!;
}

function blockFolder(stemNode: SyntaxNode, state: EditorState): { from: number; to: number } | null {
  const localBlock = computeBlocks(state)?.[stemNode.from];
  if (isPairedCommands(localBlock) && localBlock.startPos !== undefined && localBlock.endPos !== undefined) {
    // display lines that open and close block
    return {
      from: localBlock.startPos,
      to: localBlock.endPos,
    };
  }

  return null;
}
