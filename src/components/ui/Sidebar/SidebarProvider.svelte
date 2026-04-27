<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './constants.js';
  import { setSidebar } from './context.js';

  // Props
  export let disableShortcut: boolean = false;
  export let ref: HTMLDivElement | null = null;
  export let open: boolean = true;
  export let className: string = '';
  export let style: string = '';

  // Event dispatcher for two-way binding
  const dispatch = createEventDispatcher<{ openChange: boolean }>();

  // Function to handle open change
  function onOpenChange(value: boolean) {
    open = value;
    dispatch('openChange', value);
  }

  const sidebar = setSidebar({
    open: () => open,
    setOpen: onOpenChange,
  });
</script>

<svelte:window on:keydown={e => !disableShortcut && sidebar.handleShortcutKeydown(e)} />

<div
  data-slot="sidebar-wrapper"
  style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style}"
  class={cn('group/sidebar-wrapper has-data-[variant=inset]:bg-[var(--sidebar)] flex min-h-screen w-auto', className)}
  bind:this={ref}
>
  <slot />
</div>
