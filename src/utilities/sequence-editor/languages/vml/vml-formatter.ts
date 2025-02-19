import { syntaxTree } from '@codemirror/language';
import type { ChangeSpec, EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { EditorView } from 'codemirror';
import { filterEmpty } from '../../../generic';
import {
  RULE_ASSIGNMENT,
  RULE_CALL_PARAMETERS,
  RULE_ELSE,
  RULE_ELSE_IF,
  RULE_END_FOR,
  RULE_END_IF,
  RULE_END_WHILE,
  RULE_EXTERNAL_CALL,
  RULE_FLOW,
  RULE_FOR,
  RULE_FUNCTION_NAME,
  RULE_IF,
  RULE_ISSUE,
  RULE_SIMPLE_CALL,
  RULE_SIMPLE_EXPR,
  RULE_SPAWN,
  RULE_STATEMENT,
  RULE_TIME_TAGGED_STATEMENT,
  RULE_VM_MANAGEMENT,
  RULE_WHILE,
  TOKEN_ERROR,
  TOKEN_TIME_CONST,
} from './vml-constants';
import { computeBlocks } from './vml-folder';

type LineOfNodes = (SyntaxNode | undefined)[];

const INDENT_COLUMN_INDEX: number = 1;

const INDENT_SIZE = 2;

const rulesWithNoCallParameters: Set<string> = new Set([
  RULE_ASSIGNMENT,
  RULE_IF,
  RULE_ELSE_IF,
  RULE_ELSE,
  RULE_END_IF,
  RULE_WHILE,
  RULE_END_WHILE,
  RULE_FOR,
  RULE_END_FOR,
  RULE_FLOW,
]);

const rulesSupportingCallParameters: Set<string> = new Set([
  RULE_VM_MANAGEMENT,
  RULE_ISSUE,
  RULE_SIMPLE_CALL,
  RULE_EXTERNAL_CALL,
]);

function usesTwoColumnFormat(statementType: string): boolean {
  return rulesWithNoCallParameters.has(statementType);
}

function usesTableFormat(statementType: string): boolean {
  return rulesSupportingCallParameters.has(statementType);
}

function isTypeWithCallParameters(node: SyntaxNode): boolean {
  const parentName = node.parent?.name;
  if (parentName && usesTableFormat(parentName)) {
    return true;
  }
  // Vm_management type has subtypes, so need to walk up
  return node.parent?.parent?.name === RULE_VM_MANAGEMENT;
}

/*
  Formats code into columns

  0 - time
  1 - category
  2 - engine id (only present on 'Vm_management')
  3 - stem or block name
  4 - arguments
*/
export function vmlFormat(view: EditorView): void {
  const state = view.state;
  const tree = syntaxTree(state);

  const timeTaggedStatements: SyntaxNode[] = [];
  // gather spawn and issue type commands
  tree.iterate({
    enter: nodeRef => {
      if (nodeRef.name === RULE_TIME_TAGGED_STATEMENT) {
        timeTaggedStatements.push(nodeRef.node);
      }
    },
  });

  const errorFreeTimeTaggedStatements = timeTaggedStatements.filter(node => {
    const ruleType = node.getChild(RULE_STATEMENT)?.firstChild?.name;
    if (ruleType && (usesTwoColumnFormat(ruleType) || usesTableFormat(ruleType))) {
      const childCursor = node.toTree().cursor();
      do {
        // formatting algorithm doesn't correct for error tokens, ignore those lines
        if (childCursor.node.name === TOKEN_ERROR) {
          return false;
        }
      } while (childCursor.next());
      return true;
    }
    return false;
  });

  const linesToFormat: LineOfNodes[] = errorFreeTimeTaggedStatements
    .map(splitLinesIntoColumns)
    .filter((lineInfo): lineInfo is LineOfNodes => lineInfo !== null);

  // this computes indents, but changes applied need to be included in widths
  const commandIndentChangeMap = indentCommandColumn(state, linesToFormat);

  const targetWidths: number[] = linesToFormat.reduce(
    (maxWidthsByCol, currentRow) =>
      maxWidthsByCol.map((maxSoFar, columnIndex) => {
        const cellToken = currentRow[columnIndex];
        if (cellToken) {
          if (columnIndex === INDENT_COLUMN_INDEX) {
            if (isTypeWithCallParameters(cellToken)) {
              // include col[1] indentation in width calculation
              const indentChange = commandIndentChangeMap.get(currentRow) as { insert?: string };
              const commandIndent = indentChange?.insert?.length ?? 0;
              return Math.max(maxSoFar, commandIndent + cellToken.to - cellToken.from);
            } else {
              // IF, WHILE, ASSIGNMENT, ... consume rest of line
              return maxSoFar;
            }
          }
          return Math.max(maxSoFar, cellToken.to - cellToken.from);
        }
        return maxSoFar;
      }),
    new Array(4).fill(0),
  );

  const docText = state.toText(state.sliceDoc());

  const maybeChanges = linesToFormat.flatMap((line: LineOfNodes) => {
    const firstNode = line.find(filterEmpty);
    if (firstNode === undefined) {
      // unexpected case of no nodes on line
      return [];
    }

    const commandLine = docText.lineAt(firstNode.from);

    const filteredArray: SyntaxNode[] = line.filter(filterEmpty);
    const deletions: ChangeSpec[] = [];

    // remove indentation at start of line
    if (commandLine.from < firstNode.from) {
      deletions.push({
        from: commandLine.from,
        to: firstNode.from,
      });
    }

    // collapse spacing between tokens
    deletions.push(
      ...filteredArray.slice(1).map((node, index) => ({
        from: filteredArray[index].to,
        insert: ' ',
        to: node.from,
      })),
    );

    // don't insert whitespace after last token
    const lineWithoutLastColumn = line.slice(0, line.length - 1);
    const insertions: (ChangeSpec | null)[] = lineWithoutLastColumn.map(
      (node: SyntaxNode | undefined, columnNumber: number) => {
        if (!node) {
          // no node, fill with engine width plus one space
          const priorNode = line.slice(0, columnNumber).findLast(otherNode => !!otherNode);
          if (priorNode) {
            return {
              from: priorNode.to,
              insert: ' '.repeat(targetWidths[columnNumber] + 1),
            };
          }

          return null;
        }

        let length = node.to - node.from;
        if (columnNumber === INDENT_COLUMN_INDEX && node && isTypeWithCallParameters(node)) {
          // These values may be indented within column, so include indentation in their length
          const indentChange = commandIndentChangeMap.get(line) as { insert?: string };
          const commandIndent = indentChange?.insert?.length ?? 0;
          length += commandIndent;
        }

        const pad = targetWidths[columnNumber] - length;
        if (pad <= 0) {
          return null;
        }
        return {
          from: node.to,
          insert: ' '.repeat(pad),
        };
      },
    );

    return [...deletions, ...insertions];
  });

  const changes = [...commandIndentChangeMap.values(), ...maybeChanges.filter(filterEmpty)];

  // Consider delete end of line whitespace
  // Consider alignment of comments

  view.update([
    state.update({
      changes,
    }),
  ]);
}

/**
 * Returns map of lines to changes that insert spaces at left edge of column[1], this leaves the times left aligned.
 */
function indentCommandColumn(state: EditorState, linesToFormat: LineOfNodes[]): Map<LineOfNodes, ChangeSpec> {
  const map: Map<LineOfNodes, ChangeSpec> = new Map();
  const blocks = computeBlocks(state);
  const blockValues = Object.values(blocks);
  for (const line of linesToFormat) {
    const startOfLine = line.find(cell => cell)?.from;
    if (startOfLine !== undefined && line[INDENT_COLUMN_INDEX]) {
      const numOpenedBlocks = blockValues.filter(block => block.start && block.start.from < startOfLine).length;
      const numClosedBlocks = blockValues.filter(block => block.end && block.end.from <= startOfLine).length;
      const indentLevel = Math.max(0, numOpenedBlocks - numClosedBlocks);
      if (indentLevel) {
        // whitespace in column, left of text value
        const indentAmount = indentLevel * INDENT_SIZE;
        const insert = ' '.repeat(indentAmount);
        const from = line[INDENT_COLUMN_INDEX].from;
        map.set(line, { from, insert });
      }
    }
  }
  return map;
}

function splitLinesIntoColumns(statement: SyntaxNode): LineOfNodes | null {
  const timeNode = statement.getChild(TOKEN_TIME_CONST);
  const statementTypeNode = statement.getChild(RULE_STATEMENT)?.firstChild;
  const statementTypeName = statementTypeNode?.name;

  if (!statementTypeNode || !statementTypeName) {
    return null;
  }

  // account for block level
  if (statementTypeName) {
    if (usesTwoColumnFormat(statementTypeName)) {
      if (timeNode) {
        return [timeNode, statementTypeNode];
      }
    }
  }

  switch (statementTypeName) {
    case RULE_VM_MANAGEMENT:
      {
        const vmManagementType = statementTypeNode.firstChild;
        if (vmManagementType) {
          const directiveNode = vmManagementType.firstChild;
          const engineNode = vmManagementType.getChild(RULE_SIMPLE_EXPR);
          switch (vmManagementType.name) {
            case RULE_SPAWN: {
              const functionNameNode = vmManagementType.getChild(RULE_FUNCTION_NAME);
              const ruleParametersNode = vmManagementType.getChild(RULE_CALL_PARAMETERS);
              if (timeNode && directiveNode && engineNode) {
                return [
                  timeNode,
                  directiveNode,
                  engineNode,
                  functionNameNode ?? undefined,
                  ruleParametersNode ?? undefined,
                ];
              }
            }
          }
        }
      }
      break;
    case RULE_SIMPLE_CALL:
    case RULE_EXTERNAL_CALL:
    case RULE_ISSUE: {
      const directiveNode = statementTypeNode.firstChild;
      // Issue uses a function_name, calls may use a string literal or variable
      const functionNameNode = statementTypeNode.getChild(
        statementTypeName === RULE_ISSUE ? RULE_FUNCTION_NAME : RULE_SIMPLE_EXPR,
      );
      const ruleParametersNode = statementTypeNode.getChild(RULE_CALL_PARAMETERS);
      if (timeNode && directiveNode && functionNameNode) {
        return [
          timeNode,
          directiveNode,
          undefined /* reserved for engine number */,
          functionNameNode,
          ruleParametersNode ?? undefined,
        ];
      }
      break;
    }
  }

  return null;
}
