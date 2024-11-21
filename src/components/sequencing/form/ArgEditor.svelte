<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode } from '@lezer/common';
  import type { CommandDictionary, FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import type { ArgTextDef } from '../../../types/sequencing';
  import type { CommandInfoMapper } from '../../../utilities/codemirror/commandInfoMapper';
  import {
    getMissingArgDefs,
    isFswCommandArgumentBoolean,
    isFswCommandArgumentEnum,
    isFswCommandArgumentRepeat,
    isFswCommandArgumentVarString,
    isNumberArg,
    quoteEscape,
    unquoteUnescape,
  } from './../../../utilities/codemirror/codemirror-utils';
  import AddMissingArgsButton from './AddMissingArgsButton.svelte';
  import ArgTitle from './ArgTitle.svelte';
  import BooleanEditor from './BooleanEditor.svelte';
  import EnumEditor from './EnumEditor.svelte';
  import ExtraArgumentEditor from './ExtraArgumentEditor.svelte';
  import NumEditor from './NumEditor.svelte';
  import StringEditor from './StringEditor.svelte';

  export let argInfo: ArgTextDef;
  export let commandDictionary: CommandDictionary;
  export let setInEditor: (token: SyntaxNode, val: string) => void;
  export let addDefaultArgs: (commandNode: SyntaxNode, argDefs: FswCommandArgument[]) => void;
  export let commandInfoMapper: CommandInfoMapper;
  export let variablesInScope: string[];

  let argDef: FswCommandArgument | undefined = undefined;
  let enableRepeatAdd: boolean = false;
  let isSymbol: boolean = false;

  $: argDef = argInfo.argDef;

  $: {
    isSymbol = commandInfoMapper.isArgumentNodeOfVariableType(argInfo.node ?? null);
    if (!!argDef && isSymbol) {
      argDef = {
        arg_type: 'enum',
        bit_length: null,
        default_value: null,
        description: argDef.description,
        enum_name: 'variables',
        name: argDef.name,
        range: variablesInScope,
      };
    }
  }

  $: enableRepeatAdd =
    argDef !== undefined &&
    isFswCommandArgumentRepeat(argDef) &&
    argInfo.children !== undefined &&
    argDef.repeat !== null &&
    argInfo.children.length < argDef.repeat.arguments.length * (argDef.repeat.max ?? Infinity);

  function addRepeatTuple() {
    const repeatArgs = argDef && isFswCommandArgumentRepeat(argDef) && argDef.repeat?.arguments;
    if (argInfo.node && repeatArgs) {
      addDefaultArgs(argInfo.node, repeatArgs);
    }
  }
</script>

<fieldset>
  {#if !argDef}
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
    {#if argInfo.argDef}
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
    {/if}
  {/if}
</fieldset>

<style>
  button {
    margin: 8px 0px;
  }
</style>
