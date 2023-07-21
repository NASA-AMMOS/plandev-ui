<svelte:options immutable={true} />

<script lang="ts">
  import type {
    ActivityMetadataDefinition,
    ActivityMetadataSchemaEnum,
    ActivityMetadataValue,
  } from '../../types/activity-metadata';
  import ActivityMetadataBaseBoolean from './ActivityMetadataBaseBoolean.svelte';
  import ActivityMetadataBaseEnum from './ActivityMetadataBaseEnum.svelte';
  import ActivityMetadataBaseEnumMultiselect from './ActivityMetadataBaseEnumMultiselect.svelte';
  import ActivityMetadataBaseLongString from './ActivityMetadataBaseLongString.svelte';
  import ActivityMetadataBaseNumber from './ActivityMetadataBaseNumber.svelte';
  import ActivityMetadataBaseString from './ActivityMetadataBaseString.svelte';

  export let disabled: boolean = false;
  export let definition: ActivityMetadataDefinition | null = null;
  export let value: ActivityMetadataValue | null = null;

  let clientWidth: number;
  let key: string | undefined;
  let enumerates: (number | string)[];

  $: labelColumnWidth = clientWidth * 0.65;
  $: key = definition?.key;
  $: if (definition?.schema.type === 'enum' || definition?.schema.type === 'enum_multiselect') {
    enumerates = (definition.schema as ActivityMetadataSchemaEnum).enumerates;
  }
</script>

<div bind:clientWidth>
  {#if definition?.schema.type === 'boolean'}
    <ActivityMetadataBaseBoolean {key} {value} {disabled} {labelColumnWidth} on:change />
  {:else if definition?.schema.type === 'number'}
    <ActivityMetadataBaseNumber {key} {value} {disabled} {labelColumnWidth} on:change />
  {:else if definition?.schema.type === 'string'}
    <ActivityMetadataBaseString {key} {value} {disabled} {labelColumnWidth} on:change />
  {:else if definition?.schema.type === 'long_string'}
    <ActivityMetadataBaseLongString {key} {value} {disabled} {labelColumnWidth} on:change />
  {:else if definition?.schema.type === 'enum'}
    <ActivityMetadataBaseEnum {key} {value} {enumerates} {disabled} {labelColumnWidth} on:change />
  {:else if definition?.schema.type === 'enum_multiselect'}
    <ActivityMetadataBaseEnumMultiselect {key} {value} {enumerates} {disabled} {labelColumnWidth} on:change />
  {/if}
</div>
