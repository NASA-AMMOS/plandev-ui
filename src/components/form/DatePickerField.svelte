<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FieldStore } from '../../types/form';
  import { tooltip } from '../../utilities/tooltip';
  import type { ActionArray } from '../../utilities/useActions';
  import DatePicker from '../ui/DatePicker/DatePicker.svelte';
  import Field from './Field.svelte';
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
  export let useFallback: boolean = false;

  const dispatch = createEventDispatcher<{
    change: { valid: boolean };
  }>();

  async function onChange({ detail: event }: CustomEvent) {
    const { value } = event;
    const valid = await field.validateAndSet(value);
    dispatch('change', { valid });
  }
</script>

{#if !useFallback}
  <div class="date-picker-field">
    <Input {layout}>
      {#if label}
        {#if layout === 'inline'}
          <label use:tooltip={{ content: label, placement: 'top' }} class:error={$field.invalid} for={name}>
            {label}
          </label>
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
      <FieldError {field} inline={layout === 'inline'} />
    </Input>
  </div>
{:else}
  <div class="date-picker-field-fallback">
    <Field {field} on:change={onChange}>
      <Input {layout}>
        <label use:tooltip={{ content: 'Start Time', placement: 'top' }} for="start-time">
          {label}
        </label>
        <input autocomplete="off" class="st-input w-100" name="start-time" on:keyup={() => {}} />
      </Input>
    </Field>
  </div>
{/if}

<style>
  .date-picker-field-fallback :global(fieldset) {
    padding: 0;
  }

  .date-picker-field :global(.input) {
    position: inherit;
  }
</style>
