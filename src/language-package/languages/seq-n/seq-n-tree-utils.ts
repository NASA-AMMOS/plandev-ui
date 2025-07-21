import type { SyntaxNode, Tree } from '@lezer/common';
import type { ChannelDictionary, CommandDictionary, EnumMap, FswCommand, FswCommandArgument, FswCommandArgumentRepeat, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import { parseVariables, SEQN_NODES } from '@nasa-jpl/aerie-sequence-languages';
import type { EditorView } from 'codemirror';
import { SequenceTypes } from '../../../enums/sequencing';
import { type ArgTextDef, type TimeTagInfo, type UserSequence } from '../../../types/sequencing';
import { fswCommandArgDefault } from '../../../utilities/sequence-editor/command-dictionary';
import { isFswCommandArgumentRepeat } from '../../../utilities/sequence-editor/sequence-utils';
import { getFromAndTo, getNearestAncestorNodeOfType } from '../../../utilities/sequence-editor/tree-utils';
import type { CommandInfoMapper } from '../../interfaces/command-info-mapper';
import type { LibrarySequence, LibrarySequenceMap } from '../../interfaces/new-adaptation-interface';
import { globals } from './global-types';
import { SeqLanguage } from './seq-n';
import { TOKEN_ERROR } from './seq-n-constants';
import { validateVariables } from './sequence-linter';

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
  const tree = SeqLanguage.parser.parse(sequence.definition);
  return {
    name: sequence.name,
    parameters: parseVariables(tree.topNode, sequence.definition, SEQN_NODES.PARAMETER_DECLARATION) ?? [],
    type: SequenceTypes.LIBRARY,
    workspace_id: workspaceId,
  };
}

export class SeqNCommandInfoMapper implements CommandInfoMapper {

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

  getTimeTagInfo(seqEditorView: EditorView, commandNode: SyntaxNode | null): TimeTagInfo {
    const node = commandNode?.getChild('TimeTag');

    return (
      node && {
        node,
        text: seqEditorView.state.sliceDoc(node.from, node.to) ?? '',
      }
    );
  }

  getArgumentInfo(commandDef: FswCommand | null, channelDictionary: ChannelDictionary | null, seqEditorView: EditorView, args: SyntaxNode | null, argumentDefs: FswCommandArgument[] | undefined, parentArgDef: FswCommandArgumentRepeat | undefined, parameterDictionaries: ParameterDictionary[]): ArgTextDef[] {
    const argArray: ArgTextDef[] = [];
    const precedingArgValues: string[] = [];
    const parentRepeatLength = parentArgDef?.repeat?.arguments.length;

    if (args) {
      for (const node of this.getArgumentsFromContainer(args)) {
        if (node.name === TOKEN_ERROR) {
          continue;
        }

        let argDef: FswCommandArgument | undefined = undefined;
        if (argumentDefs) {
          let argDefIndex = argArray.length;
          if (parentRepeatLength !== undefined) {
            // for repeat args shift index
            argDefIndex %= parentRepeatLength;
          }
          argDef = argumentDefs[argDefIndex];
        }

        let children: ArgTextDef[] | undefined = undefined;
        if (!!argDef && isFswCommandArgumentRepeat(argDef)) {
          children = this.getArgumentInfo(
            commandDef,
            channelDictionary,
            seqEditorView,
            node,
            argDef.repeat?.arguments,
            argDef,
            parameterDictionaries,
          );
        }
        const argValue = seqEditorView.state.sliceDoc(node.from, node.to);
        argArray.push({
          argDef,
          children,
          node,
          parentArgDef,
          text: argValue,
        });
        precedingArgValues.push(argValue);
      }
    }
    // add entries for defined arguments missing from editor
    if (argumentDefs) {
      if (!parentArgDef) {
        argArray.push(...argumentDefs.slice(argArray.length).map(argDef => ({ argDef })));
      } else {
        const repeatArgs = parentArgDef?.repeat?.arguments;
        if (repeatArgs) {
          if (argArray.length % repeatArgs.length !== 0) {
            argArray.push(...argumentDefs.slice(argArray.length % repeatArgs.length).map(argDef => ({ argDef })));
          }
        }
      }
    }

    return argArray;
  }

  getCommandDef(commandDictionary: CommandDictionary | null, librarySequenceMap: LibrarySequenceMap, stemName: string): FswCommand | null {
    const commandDefFromCommandDictionary = commandDictionary?.fswCommandMap[stemName];
    if (commandDefFromCommandDictionary) {
      return commandDefFromCommandDictionary;
    } else {
      return null;
    }
  }

  getVariablesInScope(seqEditorView: EditorView, tree: Tree | null, cursorPosition?: number): string[] {
    const globalNames = globals.map(globalVariable => globalVariable.name);
    if (tree && cursorPosition !== undefined) {
      const docText = seqEditorView.state.doc.toString();
      return [...globalNames, ...this.getVariables(docText, tree)];
    }
    return globalNames;
  }

  formatArgumentArray(values: string[]): string {
    return ' ' + values.join(' ');
  }
}
