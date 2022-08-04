<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DatePicker from '../ui/DatePicker/DatePicker.svelte';
  import FieldError from './FieldError.svelte';

  export let disabled: boolean = false;
  export let field: FieldStore<any>;
  export let name: string = '';
  export let label: string = '';

  const dispatch = createEventDispatcher();

  async function onChange({ detail: event }: CustomEvent) {
    const { value } = event;
    const valid = await field.validateAndSet(value);
    dispatch('change', { valid });
  }
</script>

<fieldset>
  <label class:error={$field.invalid} for={name}>{label}</label>
  <DatePicker dateString={$field.value} {disabled} hasError={$field.invalid} {name} on:change={onChange} />
  <FieldError {field} />
</fieldset>
