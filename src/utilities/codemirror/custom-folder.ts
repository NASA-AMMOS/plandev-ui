import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

export function customFoldInside(node: SyntaxNode, state: EditorState): { from: number; to: number } | null {
  if (node.name === 'Command') {
    return foldCommand(node, state);
  }
  return null;
}

function foldCommand(node: SyntaxNode, state: EditorState): { from: number; to: number } | null {
  const stemNode = node.getChild('Stem');
  const argsNodes = node.getChildren('Args');
  const commentNode = node.getChild('LineComment');
  const metadataNode = node.getChildren('Metadata');
  const modelNodes = node.getChildren('Models');

  if (stemNode == null) {
    return null;
  }

  const from = calculateStartAndEnd([stemNode, ...argsNodes, commentNode]).to;
  const nonCommandTo = calculateStartAndEnd([...metadataNode, ...modelNodes]).to;
  const text = state.sliceDoc(from, nonCommandTo);
  // Exclude the last new line so commands remain on different lines
  const to = from + text.lastIndexOf('\n');
  return { from, to };
}

// FIXME -- this looks like copy paste of getFromAndTo()
function calculateStartAndEnd(nodes: (SyntaxNode | null)[]): { from: number; to: number } {
  return nodes.reduce(
    (acc, node) => {
      if (node === null) {
        return acc;
      }
      return {
        from: Math.min(acc.from, node.from),
        to: Math.max(acc.to, node.to),
      };
    },
    { from: Number.MAX_VALUE, to: Number.MIN_VALUE },
  );
}
