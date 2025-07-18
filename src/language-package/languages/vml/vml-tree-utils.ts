import type { SyntaxNode, Tree } from '@lezer/common';
import type { ChannelDictionary, CommandDictionary, EnumMap, FswCommand, FswCommandArgument, FswCommandArgumentRepeat, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
import type { EditorView } from 'codemirror';
import type { ArgTextDef, TimeTagInfo } from '../../../types/sequencing';
import { filterEmpty } from '../../../utilities/generic';
import { isFswCommandArgumentRepeat } from '../../../utilities/sequence-editor/sequence-utils';
import {
  filterNodesToArray,
  getChildrenNode,
  getNearestAncestorNodeOfType,
} from '../../../utilities/sequence-editor/tree-utils';
import type { CommandInfoMapper } from '../../interfaces/command-info-mapper';
import type { LibrarySequenceMap } from '../../interfaces/new-adaptation-interface';
import { getDefaultArgumentValue } from './vml-adaptation';
import { librarySequenceToFswCommand } from './vml-block-library';
import {
  GROUP_STATEMENT_SUB,
  RULE_BYTE_ARRAY,
  RULE_CALL_PARAMETER,
  RULE_CALL_PARAMETERS,
  RULE_COMMON_FUNCTION,
  RULE_CONSTANT,
  RULE_FUNCTION_NAME,
  RULE_INPUT_OUTPUT_PARAMETER,
  RULE_INPUT_PARAMETER,
  RULE_ISSUE,
  RULE_ISSUE_DYNAMIC,
  RULE_SIMPLE_EXPR,
  RULE_SPAWN,
  RULE_STATEMENT,
  RULE_TIME_TAGGED_STATEMENT,
  RULE_VARIABLE_DECLARATION_TYPE,
  RULE_VARIABLE_DECLARATION_WITH_OPTIONAL_TLM_ID,
  RULE_VARIABLE_NAME,
  RULE_VARIABLE_NAME_CONSTANT,
  RULE_VM_MANAGEMENT,
  TOKEN_COMMA,
  TOKEN_ERROR,
  TOKEN_HEX_CONST,
  TOKEN_INT_CONST,
  TOKEN_STRING_CONST,
} from './vml-constants';

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
    const statementNode = commandNode?.getChild(RULE_STATEMENT);
    if (statementNode) {
      const vmManagementNode = statementNode.getChild(RULE_VM_MANAGEMENT);
      if (vmManagementNode) {
        const spawnNode = vmManagementNode.getChild(RULE_SPAWN);
        if (spawnNode) {
          return spawnNode.getChild(RULE_CALL_PARAMETERS);
        }
      }

      // ISSUE and ISSUE_DYNAMIC
      return statementNode.firstChild?.getChild(RULE_CALL_PARAMETERS) ?? null;
    }
    return null;
  }

  getArgumentsFromContainer(containerNode: SyntaxNode): SyntaxNode[] {
    const callParameterNodes = containerNode.getChildren(RULE_CALL_PARAMETER);
    const inIssueDynamic = !!getNearestAncestorNodeOfType(containerNode, [RULE_STATEMENT])?.getChild(
      RULE_ISSUE_DYNAMIC,
    );
    if (inIssueDynamic) {
      // if in issue dynamic
      // first parameter is command name
      // remainder are arguments
      return callParameterNodes.slice(1);
    }
    return callParameterNodes;
  }

  getByteArrayElements(node: SyntaxNode | null, arrayText: string): string[] | null {
    const hexConsts: SyntaxNode[] | undefined = node?.getChild(RULE_BYTE_ARRAY)?.getChildren(TOKEN_HEX_CONST);
    if (!node || !hexConsts) {
      return null;
    }
    return hexConsts.map(hexNode => arrayText.slice(hexNode.from - node.from, hexNode.to - node.to));
  }

  getContainingCommand(node: SyntaxNode | null): SyntaxNode | null {
    return getNearestAncestorNodeOfType(node, [RULE_TIME_TAGGED_STATEMENT]);
  }

  getDefaultValueForArgumentDef(argDef: FswCommandArgument, enumMap: EnumMap): string {
    return getDefaultArgumentValue(argDef, enumMap);
  }

  getNameNode(timeTaggedStatementNode: SyntaxNode | null): SyntaxNode | null {
    return getVmlNameNode(timeTaggedStatementNode);
  }

  getVariables(docText: string, tree: Tree, position: number): string[] {
    return getVmlVariables(docText, tree, position);
  }

  isArgumentNodeOfVariableType(argNode: SyntaxNode | null): boolean {
    if (argNode?.name === RULE_CALL_PARAMETER) {
      const variableNameNode = argNode.getChild(RULE_SIMPLE_EXPR)?.getChild(RULE_VARIABLE_NAME);
      return !!variableNameNode && variableNameNode.from === argNode.from && variableNameNode.to === argNode.to;
    }
    return false;
  }

  isByteArrayArg(argNode: SyntaxNode | null): boolean {
    return !!argNode?.getChild(RULE_BYTE_ARRAY);
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

  getTimeTagInfo(seqEditorView: EditorView, node: SyntaxNode | null): TimeTagInfo {
    // REVIEW: As far as I can tell, this is the implementation used in VML (same as SeqN).
    //   However, it looks wrong... I don't see a TimeTag in the VML grammar.
    const childTimeTagNode = node?.getChild('TimeTag');

    return (
      childTimeTagNode && {
        node: childTimeTagNode,
        text: seqEditorView.state.sliceDoc(childTimeTagNode.from, childTimeTagNode.to) ?? '',
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
    }

    const librarySeqDef = librarySequenceMap[stemName];
    if (librarySeqDef) {
      return librarySequenceToFswCommand(librarySeqDef);
    }
    return null;
  }

  getVariablesInScope(seqEditorView: EditorView, tree: Tree | null, cursorPosition?: number): string[] {
    // REVIEW: As far as I can tell, VML just doesn't have globals. We should double-check this, though.
    const globalNames: string[] = [];
    if (tree && cursorPosition !== undefined) {
      const docText = seqEditorView.state.doc.toString();
      return [...globalNames, ...this.getVariables(docText, tree, cursorPosition)];
    }
    return globalNames;
  }
}

export function getVmlVariables(docText: string, tree: Tree, position: number): string[] {
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
  if (!commonFunctionNode) {
    return moduleVariables;
  }
  const subTreeOffset = commonFunctionNode.from;
  const commonFunctionParametersAndVariables = filterNodesToArray(commonFunctionNode.toTree().cursor(), node =>
    [RULE_INPUT_PARAMETER, RULE_INPUT_OUTPUT_PARAMETER, RULE_VARIABLE_NAME_CONSTANT].includes(node.name),
  )
    .map(node => node.getChild(RULE_VARIABLE_NAME))
    .filter(filterEmpty)
    .map(node => docText.slice(subTreeOffset + node.from, subTreeOffset + node.to));
  return [...moduleVariables, ...commonFunctionParametersAndVariables];
}

export function getVmlNameNode(timeTaggedStatementNode: SyntaxNode | null): SyntaxNode | null {
  const ruleStatementNode = timeTaggedStatementNode?.getChild(RULE_STATEMENT);

  const statementSubNode = ruleStatementNode?.getChild(GROUP_STATEMENT_SUB);
  if (!statementSubNode) {
    return null;
  }

  switch (statementSubNode.name) {
    case RULE_ISSUE:
      return statementSubNode.getChild(RULE_FUNCTION_NAME);
    case RULE_ISSUE_DYNAMIC:
      // first call parameter is method
      return (
        statementSubNode
          .getChild(RULE_CALL_PARAMETERS)
          ?.getChild(RULE_CALL_PARAMETER)
          ?.getChild(RULE_SIMPLE_EXPR)
          ?.getChild(RULE_CONSTANT)
          ?.getChild(TOKEN_STRING_CONST) ?? null
      );
    case RULE_VM_MANAGEMENT:
      return statementSubNode.getChild(RULE_SPAWN)?.getChild(RULE_FUNCTION_NAME) ?? null;
  }
  return null;
}

export function getArgumentPosition(argNode: SyntaxNode): number {
  const isIssueDynamic = !!getNearestAncestorNodeOfType(argNode, [RULE_ISSUE_DYNAMIC]);
  return (
    getNearestAncestorNodeOfType(argNode, [RULE_STATEMENT])
      ?.firstChild?.getChild(RULE_CALL_PARAMETERS)
      ?.getChildren(RULE_CALL_PARAMETER)
      .slice(isIssueDynamic ? 1 : 0)
      ?.findIndex(par => par.from === argNode.from && par.to === argNode.to) ?? -1
  );
}
