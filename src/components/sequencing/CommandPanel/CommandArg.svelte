<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import {
    isFswCommandArgumentBoolean,
    isFswCommandArgumentEnum,
    isFswCommandArgumentRepeat,
    isNumberArg,
    isStringArg,
  } from '../../../utilities/codemirror/codemirror-utils';
  import CommandBooleanArgDef from './CommandBooleanArgDef.svelte';
  import CommandEnumArgDef from './CommandEnumArgDef.svelte';
  import CommandNumberArgDef from './CommandNumberArgDef.svelte';
  import CommandRepeatArgDef from './CommandRepeatArgDef.svelte';
  import CommandStringArgDef from './CommandStringArgDef.svelte';

  export let commandArgumentDefinition: FswCommandArgument;
</script>

<div>
  {#if isFswCommandArgumentBoolean(commandArgumentDefinition)}
    <CommandBooleanArgDef argDef={commandArgumentDefinition} />
  {:else if isStringArg(commandArgumentDefinition)}
    <CommandStringArgDef argDef={commandArgumentDefinition} />
  {:else if isNumberArg(commandArgumentDefinition)}
    <CommandNumberArgDef argDef={commandArgumentDefinition} />
  {:else if isFswCommandArgumentEnum(commandArgumentDefinition)}
    <CommandEnumArgDef argDef={commandArgumentDefinition} />
  {:else if isFswCommandArgumentRepeat(commandArgumentDefinition)}
    <CommandRepeatArgDef argDef={commandArgumentDefinition} />
  {/if}
</div>

<!-- {#if argInfo.argDef}
  <ArgTitle
    argDef={argInfo.argDef}
    {commandInfoMapper}
    argumentValueCategory={isSymbol ? 'Symbol' : 'Literal'}
    setInEditor={val => {
      if (argInfo.node) {
        setInEditor(argInfo.node, val);
      }
    }}
  />
{/if}
{#if isSymbol && isFswCommandArgumentEnum(argDef)}
  <div class="st-typography-small-caps">Reference</div>
  <EnumEditor
    {argDef}
    initVal={argInfo.text ?? ''}
    setInEditor={val => {
      if (argInfo.node) {
        setInEditor(argInfo.node, val);
      }
    }}
  />
{:else if isFswCommandArgumentEnum(argDef) && argInfo.node}
  {#if commandInfoMapper.nodeTypeEnumCompatible(argInfo.node)}
    <EnumEditor
      {commandDictionary}
      {argDef}
      initVal={unquoteUnescape(argInfo.text ?? '')}
      setInEditor={val => {
        if (argInfo.node) {
          setInEditor(argInfo.node, quoteEscape(val));
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
{:else if isNumberArg(argDef) && commandInfoMapper.nodeTypeNumberCompatible(argInfo.node ?? null)}
  <NumEditor
    {argDef}
    initVal={Number(argInfo.text) ?? argDef.default_value ?? 0}
    setInEditor={val => {
      if (argInfo.node) {
        setInEditor(argInfo.node, val.toString());
      }
    }}
  />
{:else if isFswCommandArgumentVarString(argDef)}
  <StringEditor
    {argDef}
    initVal={argInfo.text ?? ''}
    setInEditor={val => {
      if (argInfo.node) {
        setInEditor(argInfo.node, val);
      }
    }}
  />
{:else if isFswCommandArgumentBoolean(argDef)}
  <BooleanEditor
    {argDef}
    initVal={argInfo.text ?? ''}
    setInEditor={val => {
      if (argInfo.node) {
        setInEditor(argInfo.node, val);
      }
    }}
  />
{:else if isFswCommandArgumentRepeat(argDef) && !!argInfo.children}
  {#each argInfo.children as childArgInfo}
    {#if childArgInfo.node}
      <svelte:self
        argInfo={childArgInfo}
        {commandInfoMapper}
        {commandDictionary}
        {setInEditor}
        {addDefaultArgs}
        {variablesInScope}
      />
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
  {:else if !!argDef.repeat}
    <div>
      <button
        class="st-button secondary"
        disabled={!enableRepeatAdd}
        on:click={addRepeatTuple}
        title={`Add additional set of argument values to ${argDef.name} repeat array`}
      >
        Add {argDef.name} tuple
      </button>
    </div>
  {/if}
{:else}
  <div class="st-typography-body">Unexpected value for definition</div>
{/if} -->
