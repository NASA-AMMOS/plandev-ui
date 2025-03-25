<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import { useActions, type ActionArray } from '../../utilities/useActions';

  export let className: string = '';
  export let disabled: boolean = false;
  export let selectable: boolean = true;
  export let selected: boolean = false;
  export let use: ActionArray = [];

  const dispatch = createEventDispatcher<{
    click: MouseEvent | KeyboardEvent;
  }>();

  function onClick(event: MouseEvent) {
    if (disabled) {
      event.stopPropagation();
    } else {
      event.preventDefault();
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
  class={twMerge(
    'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-3 text-[13px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  class:disabled
  class:selected
  class:selectable
  role="menuitem"
  use:useActions={use}
  on:click|stopPropagation={() => {
    /* Prevent modal close click listener from firing */
  }}
  on:mouseup={onClick}
  on:keydown={onKeydown}
  tabindex={0}
>
  <slot />
</div>
