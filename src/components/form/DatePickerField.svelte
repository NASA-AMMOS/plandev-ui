<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DatePicker from '../ui/DatePicker/DatePicker.svelte';
  import FieldError from './FieldError.svelte';

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
  <label class={$field.invalid ? 'error' : ''} for={name}>{label}</label>
  <DatePicker {name} dateString={$field.value} hasError={$field.invalid} on:change={onChange} />
  <FieldError {field} />
</fieldset>
