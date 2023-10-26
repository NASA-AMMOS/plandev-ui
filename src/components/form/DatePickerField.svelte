<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FieldStore } from '../../types/form';
  import { tooltip } from '../../utilities/tooltip';
  import type { ActionArray } from '../../utilities/useActions';
  import DatePicker from '../ui/DatePicker/DatePicker.svelte';
  import FieldError from './FieldError.svelte';
  import Input from './Input.svelte';

  export let disabled: boolean = false;
  export let field: FieldStore<any>;
  export let name: string = '';
  export let label: string = '';
  export let layout: 'inline' | 'stacked' | null = 'stacked';
  export let maxDate: Date | undefined = undefined;
  export let minDate: Date | undefined = undefined;
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher();

  async function onChange({ detail: event }: CustomEvent) {
    const { value } = event;
    const valid = await field.validateAndSet(value);
    dispatch('change', { valid });
  }
</script>

<div class="date-picker-field">
  <Input {layout}>
    {#if label}
      {#if layout === 'inline'}
        <label use:tooltip={{ content: label, placement: 'top' }} class:error={$field.invalid} for={name}>{label}</label
        >
      {:else}
        <label class:error={$field.invalid} for={name}>{label}</label>
      {/if}
    {/if}
    <DatePicker
      dateString={$field.value}
      {disabled}
      hasError={$field.invalid}
      {name}
      on:change={onChange}
      {minDate}
      {maxDate}
      {use}
    >
      <slot />
    </DatePicker>
    <FieldError {field} />
  </Input>
</div>

<style>
  .date-picker-field :global(.input) {
    position: inherit;
  }
</style>
