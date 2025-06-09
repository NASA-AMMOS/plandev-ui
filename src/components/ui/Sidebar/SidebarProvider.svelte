<script lang="ts">
  import { cn } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './constants.js';
  import { setSidebar } from './context.js';

  // Props
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
    setOpen: (value: boolean) => {
      onOpenChange(value);

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
  });
</script>

<svelte:window on:keydown={sidebar.handleShortcutKeydown} />

<div
  data-slot="sidebar-wrapper"
  style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style}"
  class={cn('group/sidebar-wrapper has-data-[variant=inset]:bg-[var(--sidebar)] flex min-h-screen w-auto', className)}
  bind:this={ref}
>
  <slot />
</div>
