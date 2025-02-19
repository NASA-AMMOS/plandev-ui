import { syntaxTree } from '@codemirror/language';
import { Decoration, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { TOKEN_COMMAND } from '../../../../constants/seq-n-grammar-constants';
import { blockMark } from '../../../codemirror/themes/block';
import { getNearestAncestorNodeOfType } from '../../tree-utils';
import { computeBlocks, isBlockCommand } from './custom-folder';

export const seqqNBlockHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor() {
      this.decorations = Decoration.none;
    }
    update(viewUpdate: ViewUpdate): DecorationSet | null {
      if (viewUpdate.selectionSet || viewUpdate.docChanged || viewUpdate.viewportChanged) {
        const blocks = seqNHighlightBlock(viewUpdate);
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

export function seqNHighlightBlock(viewUpdate: ViewUpdate): SyntaxNode[] {
  const tree = syntaxTree(viewUpdate.state);
  // Command Node includes trailing newline and white space, move to next command
  const selectionLine = viewUpdate.state.doc.lineAt(viewUpdate.state.selection.asSingle().main.from);
  const leadingWhiteSpaceLength = selectionLine.text.length - selectionLine.text.trimStart().length;
  const updatedSelectionNode = tree.resolveInner(selectionLine.from + leadingWhiteSpaceLength, 1);
  const stemNode = getNearestAncestorNodeOfType(updatedSelectionNode, [TOKEN_COMMAND])?.getChild('Stem');

  if (!stemNode || !isBlockCommand(viewUpdate.state.sliceDoc(stemNode.from, stemNode.to))) {
    return [];
  }

  const blocks = computeBlocks(viewUpdate.state);
  const pairs = Object.values(blocks);
  const matchedNodes: SyntaxNode[] = [stemNode];

  // when cursor on end -- select else and if
  let current: SyntaxNode | undefined = stemNode;
  while (current) {
    current = pairs.find(block => block.end?.from === current!.from)?.start;
    if (current) {
      matchedNodes.push(current);
    }
  }

  // when cursor on if -- select else and end
  current = stemNode;
  while (current) {
    current = pairs.find(block => block.start?.from === current!.from)?.end;
    if (current) {
      matchedNodes.push(current);
    }
  }

  return matchedNodes;
}
