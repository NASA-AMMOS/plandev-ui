<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { FieldStore } from '../../types/form';
  import { getTarget } from '../../utilities/generic';
  import FieldError from './FieldError.svelte';

  export let field: FieldStore<any>;

  const dispatch = createEventDispatcher();

  let container: HTMLFieldSetElement | null = null;
  let input: HTMLInputElement | null = null;
  let label: HTMLLabelElement | null = null;
  let select: HTMLSelectElement | null = null;

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
    if (container) {
      input = container.querySelector('input');
      label = container.querySelector('label');
      select = container.querySelector('select');

      if (input && field) {
        input.addEventListener('input', onInput);
        input.addEventListener('change', onChange);
        input.value = $field.value;
      }

      if (select && field) {
        select.addEventListener('change', onChange);
        select.value = $field.value;
      }
    }
  });

  onDestroy(() => {
    if (input) {
      input.removeEventListener('input', onInput);
      input.removeEventListener('change', onChange);
    }

    if (select) {
      select.removeEventListener('change', onChange);
    }
  });

  function onInput(event: Event) {
    const { value } = getTarget(event);
    $field.value = value;
  }

  async function onChange(event: Event) {
    const { value } = getTarget(event);
    $field.value = value;
    const valid = await field.validateAndSet(value);
    dispatch('change', { valid });
  }
</script>

<fieldset bind:this={container}>
  <slot name="label" />
  <slot>No input element provided!</slot>
  <FieldError {field} />
</fieldset>
