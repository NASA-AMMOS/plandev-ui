import type { SyntaxNode, Tree } from '@lezer/common';
import type { EnumMap, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
import { parseVariables, SEQN_NODES, unquoteUnescape } from '@nasa-jpl/aerie-sequence-languages';
import { SequenceTypes } from '../../../../enums/sequencing';
import { type LibrarySequence, type UserSequence } from '../../../../types/sequencing';
import { fswCommandArgDefault } from '../../command-dictionary';
import type { CommandInfoMapper } from '../../command-info-mapper';
import { validateVariables } from '../../sequence-linter';
import { getFromAndTo, getNearestAncestorNodeOfType } from '../../tree-utils';
import { SeqLanguage } from './seq-n';

export function getNameNode(stepNode: SyntaxNode | null) {
  if (stepNode) {
    switch (stepNode.name) {
      case SEQN_NODES.ACTIVATE:
      case SEQN_NODES.LOAD:
        return stepNode.getChild(SEQN_NODES.SEQUENCE_NAME);
      case SEQN_NODES.GROUND_BLOCK:
      case SEQN_NODES.GROUND_EVENT:
        return stepNode.getChild(SEQN_NODES.GROUND_NAME);
      case SEQN_NODES.COMMAND:
        return stepNode.getChild(SEQN_NODES.STEM);
      case SEQN_NODES.REQUEST:
        return stepNode.getChild(SEQN_NODES.REQUEST_NAME);
    }
  }

  return null;
}

export function getAncestorStepOrRequest(node: SyntaxNode | null) {
  return getNearestAncestorNodeOfType(node, [
    SEQN_NODES.COMMAND,
    SEQN_NODES.ACTIVATE,
    SEQN_NODES.GROUND_BLOCK,
    SEQN_NODES.GROUND_EVENT,
    SEQN_NODES.LOAD,
    SEQN_NODES.REQUEST,
  ]);
}

export function userSequenceToLibrarySequence(sequence: UserSequence, workspaceId: number): LibrarySequence {
  const tree: Tree = SeqLanguage.parser.parse(sequence.definition);
  const idNodes = tree.topNode.getChildren(SEQN_NODES.ID_DECLARATION);

  let sequenceId: string = '';
  if (idNodes.length) {
    const idNode = idNodes[0];
    const idValNode = idNode.firstChild;
    const { from, to } = getFromAndTo([idValNode]);
    const idVal = sequence.definition.slice(from, to);
    sequenceId = unquoteUnescape(idVal);
  }
  return {
    name: sequenceId,
    parameters: parseVariables(tree.topNode, sequence.definition, SEQN_NODES.PARAMETER_DECLARATION) ?? [],
    tree,
    type: SequenceTypes.LIBRARY,
    workspace_id: workspaceId,
  };
}

export class SeqNCommandInfoMapper implements CommandInfoMapper {
  formatArgumentArray(values: string[]): string {
    return ' ' + values.join(' ');
  }

  getArgumentAppendPosition(commandOrRepeatArgNode: SyntaxNode | null): number | undefined {
    if (
      commandOrRepeatArgNode?.name === SEQN_NODES.COMMAND ||
      commandOrRepeatArgNode?.name === SEQN_NODES.ACTIVATE ||
      commandOrRepeatArgNode?.name === SEQN_NODES.LOAD
    ) {
      const argsNode = commandOrRepeatArgNode.getChild(SEQN_NODES.ARGS);
      const stemNode = commandOrRepeatArgNode.getChild(SEQN_NODES.STEM);
      return getFromAndTo([stemNode, argsNode]).to;
    } else if (commandOrRepeatArgNode?.name === SEQN_NODES.REPEAT_ARG) {
      return commandOrRepeatArgNode.to - 1;
    }
    return undefined;
  }

  getArgumentNodeContainer(commandNode: SyntaxNode | null): SyntaxNode | null {
    return commandNode?.getChild(SEQN_NODES.ARGS) ?? null;
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
      ...validateVariables(tree.topNode.getChildren(SEQN_NODES.LOCAL_DECLARATION), docText, 'LOCALS').variables,
      ...validateVariables(tree.topNode.getChildren(SEQN_NODES.PARAMETER_DECLARATION), docText, 'INPUT_PARAMS')
        .variables,
    ].map(v => v.name);
  }

  isArgumentNodeOfVariableType(argNode: SyntaxNode | null): boolean {
    return argNode?.name === SEQN_NODES.ENUM;
  }

  isByteArrayArg(): boolean {
    return false;
  }

  nodeTypeEnumCompatible(node: SyntaxNode | null): boolean {
    return node?.name === SEQN_NODES.STRING;
  }

  nodeTypeHasArguments(node: SyntaxNode | null): boolean {
    return node?.name === SEQN_NODES.COMMAND;
  }

  nodeTypeNumberCompatible(node: SyntaxNode | null): boolean {
    return node?.name === SEQN_NODES.NUMBER;
  }
}
