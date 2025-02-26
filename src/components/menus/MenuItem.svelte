<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let use: ActionArray = [];

  export let disabled: boolean = false;
  export let selectable: boolean = true;
  export let selected: boolean = false;

  const dispatch = createEventDispatcher<{
    click: MouseEvent | KeyboardEvent;
  }>();

  function onClick(event: MouseEvent) {
    if (disabled) {
      event.stopPropagation();
    } else {
      event.preventDefault();
      event.stopPropagation();
      dispatch('click', event);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter' && !disabled) {
      event.preventDefault();
      dispatch('click', event);
    }
  }
</script>

<div
  class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
  class:disabled
  class:selected
  class:selectable
  role="menuitem"
  use:useActions={use}
  on:click={onClick}
  on:keydown={onKeydown}
  tabindex={0}
>
  <slot />
</div>
