<svelte:options immutable={true} />

<script lang="ts">
  import type { EditorState } from '@codemirror/state';
  import type { SyntaxNode } from '@lezer/common';
  import type {
    ChannelDictionary,
    CommandDictionary,
    FswCommand,
    FswCommandArgument,
    FswCommandArgumentRepeat,
    ParameterDictionary,
  } from '@nasa-jpl/aerie-ampcs';
  import type { EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { getCustomArgDef } from '../../../utilities/sequence-editor/extension-points';
  import { TOKEN_COMMAND, TOKEN_ERROR } from '../../../utilities/sequence-editor/sequencer-grammar-constants';
  import { getAncestorNode } from '../../../utilities/sequence-editor/tree-utils';
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

  type TimeTagInfo = { node: SyntaxNode; text: string } | null | undefined;

  export let editorSequenceView: EditorView;
  export let channelDictionary: ChannelDictionary | null = null;
  export let commandDictionary: CommandDictionary;
  export let parameterDictionaries: ParameterDictionary[];
  export let node: SyntaxNode | null;

  const ID_COMMAND_DETAIL_PANE = 'ID_COMMAND_DETAIL_PANE';

  let argInfoArray: ArgTextDef[] = [];
  let commandNode: SyntaxNode | null = null;
  let commandDef: FswCommand | null = null;
  let editorArgInfoArray: ArgTextDef[] = [];
  let missingArgDefArray: FswCommandArgument[] = [];
  let timeTagNode: TimeTagInfo = null;

  $: commandNode = getAncestorNode(node, TOKEN_COMMAND);
  $: commandDef = getCommandDef(commandDictionary, editorSequenceView.state, commandNode);
  $: argInfoArray = getArgumentInfo(
    commandNode?.getChild('Args') ?? null,
    commandDef?.arguments,
    undefined,
    parameterDictionaries,
  );
  $: editorArgInfoArray = argInfoArray.filter(argInfo => !!argInfo.node);
  $: missingArgDefArray = getMissingArgDefs(argInfoArray);
  $: timeTagNode = getTimeTagInfo(commandNode);

  function getTimeTagInfo(commandNode: SyntaxNode | null): TimeTagInfo {
    const node = commandNode?.getChild('TimeTag');

    return (
      node && {
        node,
        text: editorSequenceView.state.sliceDoc(node.from, node.to) ?? '',
      }
    );
  }

  function getArgumentInfo(
    args: SyntaxNode | null,
    argumentDefs: FswCommandArgument[] | undefined,
    parentArgDef: FswCommandArgumentRepeat | undefined,
    parameterDictionaries: ParameterDictionary[],
  ) {
    const argArray: ArgTextDef[] = [];
    let node = args?.firstChild;

    const precedingArgValues: string[] = [];

    // loop through nodes in editor and pair with definitions
    while (node) {
      // TODO - Consider early out on grammar error as higher chance of argument mismatch
      // skip error tokens in grammar and try to give best guess at what argument we're on
      if (node.name !== TOKEN_ERROR) {
        let argDef =
          argumentDefs &&
          argumentDefs[
            parentArgDef?.repeat?.arguments.length !== undefined
              ? argArray.length % parentArgDef?.repeat?.arguments.length
              : argArray.length
          ];
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
          children = getArgumentInfo(node, argDef.repeat?.arguments, argDef, parameterDictionaries);
        }
        const argValue = editorSequenceView.state.sliceDoc(node.from, node.to);
        argArray.push({
          argDef,
          children,
          node,
          parentArgDef,
          text: argValue,
        });
        precedingArgValues.push(argValue);
      }
      node = node.nextSibling;
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

  function getCommandDef(
    commandDictionary: CommandDictionary | null,
    state: EditorState | undefined,
    commandNode: SyntaxNode | null,
  ) {
    if (!commandDictionary || !state || !node) {
      return null;
    }

    const stemNode = commandNode?.getChild('Stem');

    if (stemNode) {
      const stemName = state.sliceDoc(stemNode.from, stemNode.to);
      return commandDictionary.fswCommandMap[stemName];
    }

    return null;
  }

  function setInEditor(token: SyntaxNode, val: string) {
    // checking that we are not in the code mirror editor
    // this breaks cycle of form edits triggering document updates and vice versa
    if (
      editorSequenceView &&
      (hasAncestorWithId(document.activeElement, ID_COMMAND_DETAIL_PANE) ||
        // Searchable Dropdown has pop out that is not a descendent
        document.activeElement?.tagName === 'BODY' ||
        document.activeElement?.tagName === 'BUTTON' ||
        document.activeElement?.tagName === 'INPUT')
    ) {
      const currentVal = editorSequenceView.state.sliceDoc(token.node.from, token.node.to);
      if (currentVal !== val) {
        editorSequenceView.dispatch(
          editorSequenceView.state.update({
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

  // When the type in the argument value is compatible with the argument definition,
  // provide a more restrictive editor to keep argument valid. Otherwise fall back on a string editor.

  // TODO
  // better handling of unclosed strings

  // {'integer_arg', 'float_arg', 'unsigned_arg', 'enum_arg', 'var_string_arg', 'repeat_arg'}
  // {'unsigned_arg', 'enum_arg', 'var_string_arg', 'float_arg'}
</script>

<Panel overflowYBody="hidden" padBody={false}>
  <svelte:fragment slot="header">
    <SectionTitle>Selected Command</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div id={ID_COMMAND_DETAIL_PANE} class="content">
      {#if !!commandNode}
        <div class="header"></div>

        {#if !!commandDef}
          {#if !!timeTagNode}
            <fieldset>
              <label for="timeTag">Time Tag</label>
              <input class="st-input w-100" disabled name="timeTag" value={timeTagNode.text.trim()} />
            </fieldset>
          {/if}

          <fieldset>
            <Collapse headerHeight={24} title={commandDef.stem} padContent={false}>{commandDef.description}</Collapse>
          </fieldset>

          {#each editorArgInfoArray as argInfo}
            <ArgEditor
              {argInfo}
              {commandDictionary}
              setInEditor={debounce(setInEditor, 250)}
              addDefaultArgs={(commandNode, missingArgDefArray) =>
                addDefaultArgs(commandDictionary, editorSequenceView, commandNode, missingArgDefArray)}
            />
          {/each}

          {#if missingArgDefArray.length}
            <fieldset>
              <AddMissingArgsButton
                setInEditor={() => {
                  if (commandNode) {
                    addDefaultArgs(commandDictionary, editorSequenceView, commandNode, missingArgDefArray);
                  }
                }}
              />
            </fieldset>
          {/if}
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
</style>
