<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Error from './Error.svelte';
  import Field from './Field.svelte';
  import InputText from './InputText.svelte';
  import Label from './Label.svelte';
  import { validate, ValidatorFn } from '../../utilities/validators';

  const dispatch = createEventDispatcher();

  export let disabled: boolean = false;
  export let error: string | null = null;
  export let invalid: boolean = false;
  export let name: string = '';
  export let placeholder: string = '';
  export let required: boolean = false;
  export let submittable: boolean = false;
  export let touched: boolean = false;
  export let type: string = 'text';
  export let validators: ValidatorFn<any>[] = [];
  export let value: any = '';

  function onChange(event: CustomEvent<number | string>) {
    const { detail: newValue } = event;
    error = validate(validators, newValue);
    invalid = error !== null;
    touched = true;
    submittable = touched && !invalid;

    if (error === null && newValue !== value) {
      value = newValue;
      dispatch('change', newValue);
    }
  }
</script>

<Field>
  <Label for={name} {invalid}>
    <slot />
  </Label>
  <InputText
    {disabled}
    {invalid}
    {name}
    {placeholder}
    {required}
    {value}
    {type}
    on:change={onChange}
  />
  <Error {error} {invalid} />
</Field>
