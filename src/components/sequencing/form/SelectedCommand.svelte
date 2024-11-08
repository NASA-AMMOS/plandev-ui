<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode, Tree } from '@lezer/common';
  import type {
    ChannelDictionary,
    CommandDictionary,
    FswCommand,
    FswCommandArgument,
    FswCommandArgumentRepeat,
    FswCommandArgumentVarString,
    ParameterDictionary,
  } from '@nasa-jpl/aerie-ampcs';
  import type { EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { TOKEN_ERROR } from '../../../constants/seq-n-grammar-constants';
  import { sequenceAdaptation } from '../../../stores/sequence-adaptation';
  import type { ISequenceAdaptation } from '../../../types/sequencing';
  import type { CommandInfoMapper } from '../../../utilities/codemirror/commandInfoMapper';
  import { getCustomArgDef } from '../../../utilities/sequence-editor/extension-points';
  import Collapse from '../../Collapse.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import {
    addDefaultArgs,
    getMissingArgDefs,
    isFswCommandArgumentRepeat,
    type ArgTextDef,
  } from './../../../utilities/codemirror/codemirror-utils';
  import AddMissingArgsButton from './AddMissingArgsButton.svelte';
  import ArgEditor from './ArgEditor.svelte';
  import StringEditor from './StringEditor.svelte';

  type TimeTagInfo = { node: SyntaxNode; text: string } | null | undefined;

  export let editorSequenceView: EditorView;
  export let channelDictionary: ChannelDictionary | null = null;
  export let commandDictionary: CommandDictionary;
  export let parameterDictionaries: ParameterDictionary[];
  export let node: SyntaxNode | null;
  export let tree: Tree | null;
  export let commandInfoMapper: CommandInfoMapper;

  const ID_COMMAND_DETAIL_PANE = 'ID_COMMAND_DETAIL_PANE';

  let argInfoArray: ArgTextDef[] = [];
  let commandNode: SyntaxNode | null = null;
  let commandNameNode: SyntaxNode | null = null;
  let commandDef: FswCommand | null = null;
  let editorArgInfoArray: ArgTextDef[] = [];
  let missingArgDefArray: FswCommandArgument[] = [];
  let timeTagNode: TimeTagInfo = null;
  let variablesInScope: string[] = [];

  $: commandNode = commandInfoMapper.getContainingCommand(node);
  $: commandNameNode = commandInfoMapper.getNameNode(commandNode);
  $: commandName = commandNameNode && editorSequenceView.state.sliceDoc(commandNameNode.from, commandNameNode.to);
  $: commandDef = getCommandDef(commandDictionary, commandName ?? '');
  $: argInfoArray = getArgumentInfo(
    commandInfoMapper,
    editorSequenceView,
    commandInfoMapper.getArgumentNodeContainer(commandNode),
    commandDef?.arguments,
    undefined,
    parameterDictionaries,
  );
  $: editorArgInfoArray = argInfoArray.filter(argInfo => !!argInfo.node);
  $: missingArgDefArray = getMissingArgDefs(argInfoArray);
  $: timeTagNode = getTimeTagInfo(editorSequenceView, commandNode);
  $: variablesInScope = getVariablesInScope(
    commandInfoMapper,
    editorSequenceView,
    $sequenceAdaptation,
    tree,
    commandNode?.from,
  );

  function getVariablesInScope(
    infoMapper: CommandInfoMapper,
    seqEditorView: EditorView,
    adaptation: ISequenceAdaptation,
    tree: Tree | null,
    cursorPosition?: number,
  ): string[] {
    const globalNames = (adaptation.globals ?? []).map(globalVariable => globalVariable.name);
    if (tree && cursorPosition !== undefined) {
      const docText = seqEditorView.state.doc.toString();
      return [...globalNames, ...infoMapper.getVariables(docText, tree, cursorPosition)];
    }
    return globalNames;
  }

  function getTimeTagInfo(seqEditorView: EditorView, commandNode: SyntaxNode | null): TimeTagInfo {
    const node = commandNode?.getChild('TimeTag');

    return (
      node && {
        node,
        text: seqEditorView.state.sliceDoc(node.from, node.to) ?? '',
      }
    );
  }

  function getArgumentInfo(
    infoMapper: CommandInfoMapper,
    seqEditorView: EditorView,
    args: SyntaxNode | null,
    argumentDefs: FswCommandArgument[] | undefined,
    parentArgDef: FswCommandArgumentRepeat | undefined,
    parameterDictionaries: ParameterDictionary[],
  ) {
    const argArray: ArgTextDef[] = [];
    const precedingArgValues: string[] = [];
    const parentRepeatLength = parentArgDef?.repeat?.arguments.length;

    if (args) {
      for (const node of infoMapper.getArgumentsFromContainer(args)) {
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

        if (commandDef && argDef) {
          argDef = getCustomArgDef(
            commandDef?.stem,
            argDef,
            precedingArgValues,
            parameterDictionaries,
            channelDictionary,
          );
        }

        let children: ArgTextDef[] | undefined = undefined;
        if (!!argDef && isFswCommandArgumentRepeat(argDef)) {
          children = getArgumentInfo(
            infoMapper,
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

  function getCommandDef(commandDictionary: CommandDictionary | null, stemName: string): FswCommand | null {
    return commandDictionary?.fswCommandMap[stemName] ?? null;
  }

  function setInEditor(seqEditorView: EditorView, token: SyntaxNode, val: string) {
    // checking that we are not in the code mirror editor
    // this breaks cycle of form edits triggering document updates and vice versa
    if (
      seqEditorView &&
      (hasAncestorWithId(document.activeElement, ID_COMMAND_DETAIL_PANE) ||
        // Searchable Dropdown has pop out that is not a descendent
        document.activeElement?.tagName === 'BODY' ||
        document.activeElement?.tagName === 'BUTTON' ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT')
    ) {
      const currentVal = seqEditorView.state.sliceDoc(token.node.from, token.node.to);
      if (currentVal !== val) {
        seqEditorView.dispatch(
          seqEditorView.state.update({
            changes: { from: token.node.from, insert: val, to: token.node.to },
            userEvent: 'formView',
          }),
        );
      }
    }
  }

  function hasAncestorWithId(element: Element | null, id: string): boolean {
    if (element === null) {
      return false;
    } else if (element.id === id) {
      return true;
    }
    return hasAncestorWithId(element.parentElement, id);
  }

  function formatTypeName(s: string) {
    // add spaces to CamelCase names, 'GroundEvent' -> 'Ground Event'
    return s.replace(/([^A-Z])(?=[A-Z])/g, '$1 ');
  }

  const nameArgumentDef: FswCommandArgumentVarString = {
    arg_type: 'var_string',
    default_value: null,
    description: '',
    max_bit_length: null,
    name: '',
    prefix_bit_length: null,
    valid_regex: null,
  };
</script>

<Panel overflowYBody="hidden" padBody={false}>
  <svelte:fragment slot="header">
    <SectionTitle>{commandNode ? `Selected ${formatTypeName(commandNode.name)}` : 'No command selected'}</SectionTitle>
  </svelte:fragment>
  <svelte:fragment slot="body">
    <div id={ID_COMMAND_DETAIL_PANE} class="content">
      {#if !!timeTagNode}
        <fieldset>
          <label class="label-row" for="timeTag">Time Tag</label>
          <input class="st-input w-100" disabled name="timeTag" value={timeTagNode.text.trim()} />
        </fieldset>
      {/if}
      {#if !!commandNode}
        {#if commandInfoMapper.nodeTypeHasArguments(commandNode)}
          {#if !!commandDef}
            <fieldset>
              <Collapse headerHeight={24} title={commandDef.stem} padContent={false}>{commandDef.description}</Collapse>
            </fieldset>

            {#each editorArgInfoArray as argInfo}
              <ArgEditor
                {argInfo}
                {commandDictionary}
                {commandInfoMapper}
                {variablesInScope}
                setInEditor={debounce((token, val) => setInEditor(editorSequenceView, token, val), 250)}
                addDefaultArgs={(commandNode, missingArgDefArray) =>
                  addDefaultArgs(
                    commandDictionary,
                    editorSequenceView,
                    commandNode,
                    missingArgDefArray,
                    commandInfoMapper,
                  )}
              />
            {/each}

            {#if missingArgDefArray.length}
              <fieldset>
                <AddMissingArgsButton
                  setInEditor={() => {
                    if (commandNode) {
                      addDefaultArgs(
                        commandDictionary,
                        editorSequenceView,
                        commandNode,
                        missingArgDefArray,
                        commandInfoMapper,
                      );
                    }
                  }}
                />
              </fieldset>
            {/if}
          {:else}
            <fieldset>
              <div class="label-row">{commandName ?? ''}</div>
            </fieldset>
            <div class="empty-state st-typography-label">Command type is not present in dictionary</div>
          {/if}
        {:else}
          <fieldset>
            <div class="label-row">{`${formatTypeName(commandNode.name)} Name`}</div>
            <div>
              <StringEditor
                argDef={nameArgumentDef}
                initVal={commandName ?? ''}
                setInEditor={val => {
                  if (commandNameNode) {
                    setInEditor(editorSequenceView, commandNameNode, val);
                  }
                }}
              />
            </div>
          </fieldset>
        {/if}
      {:else}
        <div class="empty-state st-typography-label">Select a command to modify its parameters.</div>
      {/if}
    </div>
  </svelte:fragment>
</Panel>

<style>
  .content {
    overflow: auto;
    padding-bottom: 16px;
  }

  .empty-state {
    padding: 8px 16px;
  }

  .label-row {
    font-weight: var(--st-button-font-weight);
  }
</style>
