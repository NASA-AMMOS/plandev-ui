<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode } from '@lezer/common';
  import type {
    CommandDictionary,
    FswCommand,
    FswCommandArgument,
    FswCommandArgumentVarString,
    HwCommand,
  } from '@nasa-jpl/aerie-ampcs';
  import ArrowUpRightIcon from 'bootstrap-icons/icons/arrow-up-right.svg?component';
  import type { EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import type { ArgTextDef, TimeTagInfo } from '../../../types/sequencing';
  import type { CommandInfoMapper } from '../../../utilities/codemirror/commandInfoMapper';
  import { tooltip } from '../../../utilities/tooltip';
  import AddMissingArgsButton from '../form/AddMissingArgsButton.svelte';
  import ArgEditor from '../form/ArgEditor.svelte';
  import StringEditor from '../form/StringEditor.svelte';
  import { addDefaultArgs, getMissingArgDefs } from './../../../utilities/codemirror/codemirror-utils';

  export let argInfoArray: ArgTextDef[] = [];
  export let commandDef: (FswCommand | HwCommand) | null = null;
  export let commandDictionary: CommandDictionary;
  export let commandInfoMapper: CommandInfoMapper;
  export let commandName: string | null = null;
  export let commandNameNode: SyntaxNode | null = null;
  export let commandNode: SyntaxNode | null = null;
  export let editorSequenceView: EditorView;
  export let timeTagNode: TimeTagInfo = null;
  export let variablesInScope: string[] = [];

  const ID_COMMAND_DETAIL_PANE = 'ID_COMMAND_DETAIL_PANE';

  const dispatch = createEventDispatcher<{
    selectCommandDefinition: (FswCommand | HwCommand) | null;
  }>();

  const nameArgumentDef: FswCommandArgumentVarString = {
    arg_type: 'var_string',
    default_value: null,
    description: '',
    max_bit_length: null,
    name: '',
    prefix_bit_length: null,
    valid_regex: null,
  };

  let editorArgInfoArray: ArgTextDef[] = [];
  let missingArgDefArray: FswCommandArgument[] = [];

  $: editorArgInfoArray = argInfoArray.filter(argInfo => !!argInfo.node);
  $: missingArgDefArray = getMissingArgDefs(argInfoArray);

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

  function onSelectCommandDefinition() {
    dispatch('selectCommandDefinition', commandDef);
  }
</script>

<div id={ID_COMMAND_DETAIL_PANE} class="content">
  {#if commandName != null}
    <div class="command-name">
      {commandName}
      <button
        class="open-dictionary"
        on:click={onSelectCommandDefinition}
        use:tooltip={{ content: `View dictionary entry for ${commandDef?.stem}` }}><ArrowUpRightIcon /></button
      >
    </div>
  {/if}
  {#if commandDef != null && commandDef.description != null}
    <div class="command-description">{commandDef.description}</div>
  {/if}
  {#if !!timeTagNode}
    <fieldset>
      <label class="label-row" for="timeTag">Time Tag</label>
      <input class="st-input w-100" disabled name="timeTag" value={timeTagNode.text.trim()} />
    </fieldset>
  {/if}
  {#if !!commandNode}
    {#if commandInfoMapper.nodeTypeHasArguments(commandNode)}
      {#if !!commandDef}
        {#each editorArgInfoArray as argInfo}
          <ArgEditor
            {argInfo}
            {commandDictionary}
            {commandInfoMapper}
            {variablesInScope}
            setInEditor={debounce((token, val) => setInEditor(editorSequenceView, token, val), 250)}
            addDefaultArgs={(commandNodeToAddArgs, missingArgDefs) =>
              addDefaultArgs(
                commandDictionary,
                editorSequenceView,
                commandNodeToAddArgs,
                missingArgDefs,
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
    <div class="empty-state st-typography-label">
      Select a command or open the
      <div class="no-wrap">
        <button class="st-typography-label st-button-link" on:click={onSelectCommandDefinition}>
          command dictionary
        </button>.
      </div>
    </div>
  {/if}
</div>

<style>
  .content {
    height: 100%;
    overflow: auto;
  }

  .empty-state {
    padding: 35px 8px;
    text-align: center;
  }

  .label-row {
    font-weight: var(--st-button-font-weight);
  }

  .no-wrap {
    display: inline;
    white-space: nowrap;
  }

  .command-name {
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-20);
    display: grid;
    font-weight: 500;
    grid-template-columns: auto min-content;
    padding: 8px 16px;
  }

  .command-name .open-dictionary {
    align-items: center;
    background: none;
    border: none;
    color: var(--st-button-icon-color);
    cursor: pointer;
    display: inline-flex;
    padding: 0;
  }

  .command-name .open-dictionary :global(svg) {
    height: 15px;
    width: 15px;
  }

  .command-description {
    padding: 8px 16px;
  }
</style>
