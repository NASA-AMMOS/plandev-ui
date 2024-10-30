import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { hoverTooltip, type Tooltip } from '@codemirror/view';
import type {
  CommandDictionary,
  FswCommand,
  FswCommandArgument,
  FswCommandArgumentInteger,
} from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import ArgumentTooltip from '../../../components/sequencing/ArgumentTooltip.svelte';
import CommandTooltip from '../../../components/sequencing/CommandTooltip.svelte';
import { getTokenPositionInLine } from '../../sequence-editor/sequence-tooltip';
import { checkContainment, getNearestAncestorNodeOfType } from '../../sequence-editor/tree-utils';
import {
  RULE_CALL_PARAMETER,
  RULE_CALL_PARAMETERS,
  RULE_CONSTANT,
  RULE_FUNCTION_NAME,
  RULE_ISSUE,
  RULE_SIMPLE_EXPR,
  RULE_STATEMENT,
  RULE_TIME_TAGGED_STATEMENT,
  RULE_VM_MANAGEMENT,
  TOKEN_INT_CONST,
} from './vmlConstants';

const sequenceEngineArgument: FswCommandArgumentInteger = {
  arg_type: 'integer',
  bit_length: 8,
  default_value: null,
  description: `Sequence Engine / Virtual Machine. -1 is used to specify next available engine`,
  name: `Sequence Engine / Virtual Machine`,
  range: null,
  units: '',
};

export function vmlTooltip(commandDictionary: CommandDictionary | null): Extension {
  return hoverTooltip((view: EditorView, pos: number, side: number): Tooltip | null => {
    const { from, to } = getTokenPositionInLine(view, pos);

    // First handle the case where the token is out of bounds.
    if ((from === pos && side < 0) || (to === pos && side > 0)) {
      return null;
    }

    const tree = syntaxTree(view.state);
    const cursorNode = tree.cursorAt(from, 1).node;

    const timeTaggedNode = getNearestAncestorNodeOfType(cursorNode, [RULE_TIME_TAGGED_STATEMENT]);

    if (!timeTaggedNode) {
      return null;
    }
    const statementSubNode = timeTaggedNode.getChild(RULE_STATEMENT)?.firstChild;

    if (!statementSubNode) {
      return null;
    }

    switch (statementSubNode.name) {
      case RULE_VM_MANAGEMENT:
        {
          if (
            checkContainment(cursorNode, [
              RULE_VM_MANAGEMENT,
              undefined,
              RULE_SIMPLE_EXPR,
              RULE_CONSTANT,
              TOKEN_INT_CONST,
            ])
          ) {
            return argTooptip(sequenceEngineArgument, null, from, to);
          }
        }
        break;
      case RULE_ISSUE: {
        const functionNameNode = statementSubNode.getChild(RULE_FUNCTION_NAME);
        if (functionNameNode) {
          const commandName = view.state.sliceDoc(functionNameNode.from, functionNameNode.to);
          const command = commandDictionary?.fswCommandMap[commandName];
          if (command) {
            const callParametersNode = getNearestAncestorNodeOfType(cursorNode, [RULE_CALL_PARAMETERS]);
            if (callParametersNode) {
              const thisCallParameterNode =
                cursorNode.name === RULE_CALL_PARAMETER
                  ? cursorNode
                  : getNearestAncestorNodeOfType(cursorNode, [RULE_CALL_PARAMETER]);

              if (thisCallParameterNode) {
                const parameterNodes = callParametersNode.getChildren(RULE_CALL_PARAMETER);
                const argIndex = parameterNodes.findIndex(
                  callParameterNode =>
                    callParameterNode.to === thisCallParameterNode.to &&
                    callParameterNode.from === thisCallParameterNode.from,
                );

                const arg = command.arguments[argIndex];
                if (arg) {
                  return argTooptip(arg, commandDictionary, from, to);
                }
              }
            }

            return cmdTooltip(command, from, to);
          }
        }
      }
    }

    return null;
  });
}

function argTooptip(
  arg: FswCommandArgument,
  commandDictionary: CommandDictionary | null,
  from: number,
  to: number,
): Tooltip {
  return {
    above: true,
    create() {
      const dom = document.createElement('div');
      new ArgumentTooltip({
        props: { arg, commandDictionary },
        target: dom,
      });
      return { dom };
    },
    end: to,
    pos: from,
  };
}

function cmdTooltip(command: FswCommand, from: number, to: number): Tooltip {
  return {
    above: true,
    create() {
      const dom = document.createElement('div');
      new CommandTooltip({ props: { command }, target: dom });
      return { dom };
    },
    end: to,
    pos: from,
  };
}
