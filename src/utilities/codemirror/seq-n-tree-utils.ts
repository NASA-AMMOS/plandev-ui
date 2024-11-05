import type { SyntaxNode, Tree } from '@lezer/common';
import type { EnumMap, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import {
  RULE_ARGS,
  RULE_COMMAND,
  RULE_GROUND_NAME,
  RULE_REQUEST_NAME,
  RULE_SEQUENCE_NAME,
  RULE_STEM,
  TOKEN_ACTIVATE,
  TOKEN_COMMAND,
  TOKEN_GROUND_BLOCK,
  TOKEN_GROUND_EVENT,
  TOKEN_LOAD,
  TOKEN_NUMBER,
  TOKEN_REPEAT_ARG,
  TOKEN_REQUEST,
  TOKEN_STRING,
} from '../../constants/seq-n-grammar-constants';
import { fswCommandArgDefault } from '../sequence-editor/command-dictionary';
import { validateVariables } from '../sequence-editor/sequence-linter';
import { getFromAndTo, getNearestAncestorNodeOfType } from '../sequence-editor/tree-utils';
import type { CommandInfoMapper } from './commandInfoMapper';

export function getNameNode(stepNode: SyntaxNode | null) {
  if (stepNode) {
    switch (stepNode.name) {
      case TOKEN_ACTIVATE:
      case TOKEN_LOAD:
        return stepNode.getChild(RULE_SEQUENCE_NAME);
      case TOKEN_GROUND_BLOCK:
      case TOKEN_GROUND_EVENT:
        return stepNode.getChild(RULE_GROUND_NAME);
      case TOKEN_COMMAND:
        return stepNode.getChild(RULE_STEM);
      case TOKEN_REQUEST:
        return stepNode.getChild(RULE_REQUEST_NAME);
    }
  }

  return null;
}

export function getAncestorStepOrRequest(node: SyntaxNode | null) {
  return getNearestAncestorNodeOfType(node, [
    TOKEN_COMMAND,
    TOKEN_ACTIVATE,
    TOKEN_GROUND_BLOCK,
    TOKEN_GROUND_EVENT,
    TOKEN_LOAD,
    TOKEN_REQUEST,
  ]);
}

export class SeqNCommandInfoMapper implements CommandInfoMapper {
  formatArgumentArray(values: string[]): string {
    return ' ' + values.join(' ');
  }

  getArgumentAppendPosition(commandOrRepeatArgNode: SyntaxNode | null): number | undefined {
    if (commandOrRepeatArgNode?.name === RULE_COMMAND) {
      const argsNode = commandOrRepeatArgNode.getChild('Args');
      const stemNode = commandOrRepeatArgNode.getChild('Stem');
      return getFromAndTo([stemNode, argsNode]).to;
    } else if (commandOrRepeatArgNode?.name === TOKEN_REPEAT_ARG) {
      return commandOrRepeatArgNode.to - 1;
    }
    return undefined;
  }

  getArgumentNodeContainer(commandNode: SyntaxNode | null): SyntaxNode | null {
    return commandNode?.getChild(RULE_ARGS) ?? null;
  }

  getArgumentsFromContainer(containerNode: SyntaxNode | null): SyntaxNode[] {
    const children: SyntaxNode[] = [];

    let child = containerNode?.firstChild;
    while (child) {
      children.push(child);
      child = child.nextSibling;
    }

    return children;
  }

  getContainingCommand(node: SyntaxNode | null): SyntaxNode | null {
    return getAncestorStepOrRequest(node);
  }

  getDefaultValueForArgumentDef(argDef: FswCommandArgument, enumMap: EnumMap): string {
    return fswCommandArgDefault(argDef, enumMap);
  }

  getNameNode(stepNode: SyntaxNode | null): SyntaxNode | null {
    return getNameNode(stepNode);
  }

  getVariables(docText: string, tree: Tree): string[] {
    return [
      ...validateVariables(tree.topNode.getChildren('LocalDeclaration'), docText, 'LOCALS').variables,
      ...validateVariables(tree.topNode.getChildren('ParameterDeclaration'), docText, 'INPUT_PARAMS').variables,
    ].map(v => v.name);
  }

  isArgumentNodeOfVariableType(argNode: SyntaxNode | null): boolean {
    return argNode?.name === 'Enum';
  }

  nodeTypeEnumCompatible(node: SyntaxNode | null): boolean {
    return node?.name === TOKEN_STRING;
  }

  nodeTypeHasArguments(node: SyntaxNode | null): boolean {
    return node?.name === TOKEN_COMMAND;
  }

  nodeTypeNumberCompatible(node: SyntaxNode | null): boolean {
    return node?.name === TOKEN_NUMBER;
  }
}
