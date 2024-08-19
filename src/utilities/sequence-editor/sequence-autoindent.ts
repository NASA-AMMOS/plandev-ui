import { syntaxTree, type IndentContext } from '@codemirror/language';
import { getNearestAncestorNodeOfType } from './tree-utils';

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

    // otherwise, don't indent
    return 0;
  };
}
