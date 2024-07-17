<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode } from '@lezer/common';
  import type { CommandDictionary, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import {
    getMissingArgDefs,
    isFswCommandArgumentRepeat,
    isFswCommandArgumentVarString,
    isNumberArg,
    quoteEscape,
    type ArgTextDef,
  } from './../../../utilities/codemirror/codemirror-utils';
  import AddMissingArgsButton from './AddMissingArgsButton.svelte';
  import ArgTitle from './ArgTitle.svelte';
  import EnumEditor from './EnumEditor.svelte';
  import ExtraArgumentEditor from './ExtraArgumentEditor.svelte';
  import NumEditor from './NumEditor.svelte';
  import StringEditor from './StringEditor.svelte';

  export let argInfo: ArgTextDef;
  export let commandDictionary: CommandDictionary;
  export let setInEditor: (token: SyntaxNode, val: string) => void;
  export let addDefaultArgs: (commandNode: SyntaxNode, argDefs: FswCommandArgument[]) => void;

  $: enableRepeatAdd =
    argInfo.argDef &&
    isFswCommandArgumentRepeat(argInfo.argDef) &&
    argInfo.children &&
    argInfo.argDef.repeat &&
    argInfo.children.length < argInfo.argDef.repeat.arguments.length * (argInfo.argDef.repeat.max ?? Infinity);

  function addRepeatTuple() {
    const repeatArgs = argInfo.argDef && isFswCommandArgumentRepeat(argInfo.argDef) && argInfo.argDef.repeat?.arguments;
    if (argInfo.node && repeatArgs) {
      addDefaultArgs(argInfo.node, repeatArgs);
    }
  }
</script>

<fieldset>
  {#if !argInfo.argDef}
    {#if argInfo.text}
      <div class="st-typography-medium" title="Unknown Argument">Unknown Argument</div>
      <ExtraArgumentEditor
        initVal={argInfo.text}
        setInEditor={() => {
          if (argInfo.node) {
            setInEditor(argInfo.node, '');
          }
        }}
      />
    {/if}
  {:else}
    <ArgTitle argDef={argInfo.argDef} />
    {#if argInfo.argDef.arg_type === 'enum' && argInfo.node}
      {#if argInfo.node?.name === 'String'}
        <EnumEditor
          {commandDictionary}
          argDef={argInfo.argDef}
          initVal={argInfo.text ?? ''}
          setInEditor={val => {
            if (argInfo.node) {
              setInEditor(argInfo.node, val);
            }
          }}
        />
      {:else}
        <button
          class="st-button"
          on:click={() => {
            if (argInfo.node && argInfo.text) {
              setInEditor(argInfo.node, quoteEscape(argInfo.text));
            }
          }}
        >
          Convert to enum type
        </button>
      {/if}
    {:else if isNumberArg(argInfo.argDef) && argInfo.node?.name === 'Number'}
      <NumEditor
        argDef={argInfo.argDef}
        initVal={Number(argInfo.text) ?? argInfo.argDef.default_value ?? 0}
        setInEditor={val => {
          if (argInfo.node) {
            setInEditor(argInfo.node, val.toString());
          }
        }}
      />
    {:else if isFswCommandArgumentVarString(argInfo.argDef)}
      <StringEditor
        argDef={argInfo.argDef}
        initVal={argInfo.text ?? ''}
        setInEditor={val => {
          if (argInfo.node) {
            setInEditor(argInfo.node, val);
          }
        }}
      />
    {:else if isFswCommandArgumentRepeat(argInfo.argDef) && !!argInfo.children}
      {#each argInfo.children as childArgInfo}
        {#if childArgInfo.node}
          <svelte:self argInfo={childArgInfo} {commandDictionary} {setInEditor} {addDefaultArgs} />
        {/if}
      {/each}
      {#if argInfo.children.find(childArgInfo => !childArgInfo.node)}
        <AddMissingArgsButton
          setInEditor={() => {
            if (argInfo.node && argInfo.children) {
              addDefaultArgs(argInfo.node, getMissingArgDefs(argInfo.children));
            }
          }}
        />
      {:else if !!argInfo.argDef.repeat}
        <div>
          <button
            class="st-button secondary"
            disabled={!enableRepeatAdd}
            on:click={addRepeatTuple}
            title={`Add additional set of argument values to ${argInfo.argDef.name} repeat array`}
          >
            Add {argInfo.argDef.name} tuple
          </button>
        </div>
      {/if}
    {:else}
      <div class="st-typography-body">Unexpected value for definition</div>
    {/if}
  {/if}
</fieldset>

<style>
  button {
    margin: 8px 0px;
  }
</style>
