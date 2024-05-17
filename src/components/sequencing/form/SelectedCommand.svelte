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
  import { getCustomArgDef } from '../../../utilities/new-sequence-editor/extension-points';
  import { TOKEN_COMMAND, TOKEN_ERROR } from '../../../utilities/new-sequence-editor/sequencer-grammar-constants';
  import { getAncestorNode } from '../../../utilities/new-sequence-editor/tree-utils';
  import AddMissingArgsButton from './AddMissingArgsButton.svelte';
  import ArgEditor from './ArgEditor.svelte';
  import { addDefaultArgs, getMissingArgDefs, isFswCommandArgumentRepeat, type ArgTextDef } from './utils';

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
        document.activeElement?.tagName === 'BODY')
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

  function hasAncestorWithId(element: Element | null, id: string) {
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

<div class="select-command-detail" id={ID_COMMAND_DETAIL_PANE}>
  {#if !!commandNode}
    <div>Selected Command</div>
    {#if !!commandDef}
      {#if !!timeTagNode}
        <div>Time Tag: {timeTagNode.text.trim()}</div>
      {/if}
      <div>
        <details>
          <summary>{commandDef.stem}</summary>
          {commandDef.description}
        </details>
      </div>
      <hr />
      <div class="select-command-argument-detail">
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
          <AddMissingArgsButton
            setInEditor={() => {
              if (commandNode) {
                addDefaultArgs(commandDictionary, editorSequenceView, commandNode, missingArgDefArray);
              }
            }}
          />
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .select-command-detail {
    padding: 10px;
    width: 100%;
  }
</style>
