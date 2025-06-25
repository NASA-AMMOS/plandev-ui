import { indentSelection } from '@codemirror/commands';
import { syntaxTree, type IndentContext } from '@codemirror/language';
import { EditorView } from 'codemirror';
import { getNearestAncestorNodeOfType } from '../../../utilities/sequence-editor/tree-utils';
import { computeBlocks } from './custom-folder';

const TAB_SIZE = 2;
/**
 * Returns a function that provides auto-indentation for the CodeMirror editor.
 * The indentation rules are as follows:
 * - If the previous line contains '@REQUEST_BEGIN', indent one level.
 * - If the current line contains '@REQUEST_END', reset the indentation.
 * - If the current line is inside a request block, indent one level.
 *
 * @param {IndentContext} context - The context object containing information about the editor state.
 * @param {number} pos - The position in the editor where indentation is needed.
 * @return {number | null | undefined} The number of spaces to indent or null/undefined if no indentation is needed.
 */
export function sequenceAutoIndent(): (context: IndentContext, pos: number) => number | null | undefined {
  return (context, pos) => {
    // see if the inner children are part of the request block
    const stepNode = getNearestAncestorNodeOfType(syntaxTree(context.state).cursorAt(pos).node, ['Steps']);
    const requestNode = getNearestAncestorNodeOfType(stepNode, ['Request']);

    // if it is a request node, indent one level
    if (requestNode) {
      return TAB_SIZE;
    }

    // if you are here you in the code are most likely at the top or bottom of the request block
    // The syntax tree is hard to parse as there are some ambiguity of were you are in
    // the tree nodes. So we need to help it out by looking at the previous and current lines
    // text
    const prevLineText = pos > 0 ? context.lineAt(pos - 1).text : '';
    const currLineText = context.lineAt(pos).text;

    // if the previous line is a request begin, indent one level
    if (prevLineText.trim().includes('@REQUEST_BEGIN')) {
      return TAB_SIZE;
    }

    // if the current line is a request end, reset indent
    if (currLineText.trim().includes('@REQUEST_END')) {
      return 0;
    }

    const blocks = computeBlocks(context.state);
    if (blocks && Object.values(blocks).length) {
      const openPairsAtPosition = Object.values(blocks).filter(
        pair => pair.start && pair.start?.from < pos && (!pair.endPos || pair.endPos >= pos),
      );
      return openPairsAtPosition.length * TAB_SIZE;
    }

    // otherwise, don't indent
    return 0;
  };
}

export function seqNFormat(editorSequenceView: EditorView) {
  // apply indentation
  editorSequenceView.update([
    editorSequenceView.state.update({
      selection: { anchor: 0, head: editorSequenceView.state.doc.length },
    }),
  ]);
  indentSelection({
    dispatch: transaction => editorSequenceView.update([transaction]),
    state: editorSequenceView.state,
  });
  // clear selection
  editorSequenceView.update([
    editorSequenceView.state.update({
      selection: { anchor: 0, head: 0 },
    }),
  ]);
}
