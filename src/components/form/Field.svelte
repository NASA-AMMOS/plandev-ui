<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { FieldStore } from '../../types';
  import { getTarget } from '../../utilities/generic';
  import FieldError from './FieldError.svelte';

  const dispatch = createEventDispatcher();

  export let field: FieldStore<any>;

  let container: HTMLFieldSetElement | null;
  let input: HTMLInputElement | null;
  let label: HTMLLabelElement | null;
  let select: HTMLSelectElement | null;

  $: if (container && field && input) {
    if (input.value !== $field.value) {
      input.value = $field.value;
    }

    if ($field.invalid) {
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  }

  $: if (container && field && label) {
    if ($field.invalid) {
      label.classList.add('error');
    } else {
      label.classList.remove('error');
    }
  }

  $: if (container && field && select) {
    if (select.value !== $field.value) {
      select.value = $field.value;
    }

    if ($field.invalid) {
      select.classList.add('error');
    } else {
      select.classList.remove('error');
    }
  }

  onMount(() => {
    input = container.querySelector('input');
    label = container.querySelector('label');
    select = container.querySelector('select');

    if (input && field) {
      input.addEventListener('blur', onBlur);
      input.addEventListener('input', onInput);
      input.addEventListener('keydown', onKeyDown);
      input.value = $field.value;
    }

    if (select && field) {
      select.addEventListener('blur', onBlur);
      select.addEventListener('input', onInput);
      select.value = $field.value;
    }
  });

  onDestroy(() => {
    if (input) {
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeyDown);
    }

    if (select) {
      select.removeEventListener('blur', onBlur);
      select.removeEventListener('input', onInput);
    }
  });

  async function onBlur(event: FocusEvent) {
    const { value } = getTarget(event);
    const valid = await field.validate(value);
    if (valid) dispatch('valid');
  }

  function onInput(event: InputEvent) {
    const { value } = getTarget(event);
    $field.value = value;
  }

  async function onKeyDown(event: KeyboardEvent) {
    const { key } = event;

    if (key === 'Enter') {
      event.preventDefault();
      const { value } = getTarget(event);
      const valid = await field.validate(value);
      if (valid) dispatch('valid');
    }
  }
</script>

<fieldset bind:this={container}>
  <slot name="label" />
  <slot>No input element provided!</slot>
  <FieldError {field} />
</fieldset>
