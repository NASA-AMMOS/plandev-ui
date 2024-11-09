import type { SyntaxNode, Tree } from '@lezer/common';
import type { EnumMap, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import { filterEmpty } from '../../generic';
import { filterNodesToArray, getChildrenNode, getNearestAncestorNodeOfType } from '../../sequence-editor/tree-utils';
import type { CommandInfoMapper } from '../commandInfoMapper';
import { getDefaultArgumentValue } from './vmlAdaptation';
import {
  RULE_CALL_PARAMETER,
  RULE_CALL_PARAMETERS,
  RULE_COMMON_FUNCTION,
  RULE_CONSTANT,
  RULE_FUNCTION_NAME,
  RULE_INPUT_OUTPUT_PARAMETER,
  RULE_INPUT_PARAMETER,
  RULE_ISSUE,
  RULE_SIMPLE_EXPR,
  RULE_STATEMENT,
  RULE_TIME_TAGGED_STATEMENT,
  RULE_VARIABLE_DECLARATION_TYPE,
  RULE_VARIABLE_DECLARATION_WITH_OPTIONAL_TLM_ID,
  RULE_VARIABLE_NAME,
  RULE_VARIABLE_NAME_CONSTANT,
  TOKEN_COMMA,
  TOKEN_INT_CONST,
  TOKEN_STRING_CONST,
} from './vmlConstants';

export class VmlCommandInfoMapper implements CommandInfoMapper {
  formatArgumentArray(values: string[], commandNode: SyntaxNode | null): string {
    let prefix = ' ';
    if (commandNode?.name === RULE_TIME_TAGGED_STATEMENT) {
      const callParametersNode = commandNode.firstChild?.nextSibling?.firstChild?.getChild(RULE_CALL_PARAMETERS);
      if (callParametersNode) {
        const hasParametersSpecified = !!callParametersNode.getChild(RULE_CALL_PARAMETER);
        if (hasParametersSpecified) {
          const children = getChildrenNode(callParametersNode);
          const hasTrailingComma =
            children.findLastIndex(node => node.name === TOKEN_COMMA) >
            children.findLastIndex(node => node.name === RULE_CALL_PARAMETER);
          prefix = hasTrailingComma ? '' : ',';
        }
      }
    }
    return prefix + values.join(',');
  }

  getArgumentAppendPosition(node: SyntaxNode | null): number | undefined {
    if (node?.name === RULE_TIME_TAGGED_STATEMENT) {
      return node.firstChild?.nextSibling?.firstChild?.getChild(RULE_CALL_PARAMETERS)?.to ?? undefined;
    }
    return node?.getChild(RULE_CALL_PARAMETERS)?.to ?? undefined;
  }

  getArgumentNodeContainer(commandNode: SyntaxNode | null): SyntaxNode | null {
    return commandNode?.getChild(RULE_STATEMENT)?.firstChild?.getChild(RULE_CALL_PARAMETERS) ?? null;
  }

  getArgumentsFromContainer(containerNode: SyntaxNode): SyntaxNode[] {
    return containerNode?.getChildren(RULE_CALL_PARAMETER) ?? [];
  }

  getContainingCommand(node: SyntaxNode | null): SyntaxNode | null {
    return getNearestAncestorNodeOfType(node, [RULE_TIME_TAGGED_STATEMENT]);
  }

  getDefaultValueForArgumentDef(argDef: FswCommandArgument, enumMap: EnumMap): string {
    return getDefaultArgumentValue(argDef, enumMap);
  }

  getNameNode(statementNode: SyntaxNode | null): SyntaxNode | null {
    const statementSubNode = statementNode?.getChild(RULE_STATEMENT)?.getChild(RULE_ISSUE);
    if (statementSubNode?.name === RULE_ISSUE) {
      return statementSubNode.getChild(RULE_FUNCTION_NAME);
    }
    // once block library is implemented allow spawn here too
    return null;
  }

  getVariables(docText: string, tree: Tree, position: number): string[] {
    // VML Variable_declaration_with_optional_tlm_id are per module (only 1 module per file)
    // VML Common_Function may contain Parameters and Variable_declarations

    const moduleVariables = filterNodesToArray(
      tree.cursor(),
      node => node.name === RULE_VARIABLE_DECLARATION_WITH_OPTIONAL_TLM_ID,
    )
      .map(node =>
        node
          .getChild(RULE_VARIABLE_DECLARATION_TYPE)
          ?.getChild(RULE_VARIABLE_NAME_CONSTANT)
          ?.getChild(RULE_VARIABLE_NAME),
      )
      .filter(filterEmpty)
      .map(node => docText.slice(node.from, node.to));

    const positionNode = tree.resolveInner(position);
    const commonFunctionNode = getNearestAncestorNodeOfType(positionNode, [RULE_COMMON_FUNCTION]);
    if (commonFunctionNode) {
      const subTreeOffset = commonFunctionNode.from;
      const commonFunctionParametersAndVariables = filterNodesToArray(commonFunctionNode.toTree().cursor(), node =>
        [RULE_INPUT_PARAMETER, RULE_INPUT_OUTPUT_PARAMETER, RULE_VARIABLE_NAME_CONSTANT].includes(node.name),
      )
        .map(node => node.getChild(RULE_VARIABLE_NAME))
        .filter(filterEmpty)
        .map(node => docText.slice(subTreeOffset + node.from, subTreeOffset + node.to));
      return [...moduleVariables, ...commonFunctionParametersAndVariables];
    }

    return moduleVariables;
  }

  isArgumentNodeOfVariableType(argNode: SyntaxNode | null): boolean {
    if (argNode?.name === RULE_CALL_PARAMETER) {
      const variableNameNode = argNode.getChild(RULE_SIMPLE_EXPR)?.getChild(RULE_VARIABLE_NAME);
      return !!variableNameNode && variableNameNode.from === argNode.from && variableNameNode.to === argNode.to;
    }
    return false;
  }

  nodeTypeEnumCompatible(node: SyntaxNode | null): boolean {
    return !!node?.getChild(RULE_SIMPLE_EXPR)?.getChild(RULE_CONSTANT)?.getChild(TOKEN_STRING_CONST);
  }

  nodeTypeHasArguments(node: SyntaxNode | null): boolean {
    return node?.name === RULE_TIME_TAGGED_STATEMENT;
  }

  nodeTypeNumberCompatible(node: SyntaxNode | null): boolean {
    return !!node?.getChild(RULE_SIMPLE_EXPR)?.getChild(RULE_CONSTANT)?.getChild(TOKEN_INT_CONST);
  }
}

export function getArgumentPosition(argNode: SyntaxNode): number {
  return (
    getNearestAncestorNodeOfType(argNode, [RULE_STATEMENT])
      ?.firstChild?.getChild(RULE_CALL_PARAMETERS)
      ?.getChildren(RULE_CALL_PARAMETER)
      ?.findIndex(par => par.from === argNode.from && par.to === argNode.to) ?? -1
  );
}
