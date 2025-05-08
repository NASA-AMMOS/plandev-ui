<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { uniqueId } from 'lodash-es';
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

  $: id = uniqueId(name);

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
          <div use:tooltip={{ content: label, placement: 'top' }}>
            <Label size="sm" class="flex {$field.invalid ? 'text-red-500' : ''}" for={id}>
              {label}
            </Label>
          </div>
        {:else}
          <Label size="sm" class="flex pb-0.5 {$field.invalid ? 'text-red-500' : ''}" for={id}>
            {label}
          </Label>
        {/if}
      {/if}
      <DatePicker
        dateString={$field.value}
        {disabled}
        hasError={$field.invalid}
        {id}
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
  <div class="[&_fieldset]:p-0">
    <Field {field} on:change={onChange}>
      <Input {layout}>
        <div use:tooltip={{ content: 'Start Time', placement: 'top' }}>
          <Label size="sm" class="flex {layout === 'stacked' ? 'pb-0.5' : ''}" for={name}>
            {label}
          </Label>
        </div>
        <InputStellar
          sizeVariant="xs"
          autocomplete="off"
          id={uniqueId(name)}
          aria-label="Start Time"
          on:keyup={() => {}}
          {name}
          {disabled}
        />
      </Input>
    </Field>
  </div>
{/if}
