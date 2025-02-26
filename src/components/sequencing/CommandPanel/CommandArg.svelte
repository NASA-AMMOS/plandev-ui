<svelte:options immutable={true} />

<script lang="ts">
  import type { FswCommandArgument } from '@nasa-jpl/aerie-ampcs';
  import {
    isFswCommandArgumentBoolean,
    isFswCommandArgumentEnum,
    isFswCommandArgumentRepeat,
    isNumberArg,
    isStringArg,
  } from '../../../utilities/sequence-editor/sequence-utils';
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
