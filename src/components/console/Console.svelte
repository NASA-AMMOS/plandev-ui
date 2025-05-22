<svelte:options immutable={true} />

<script context="module" lang="ts">
  // Tabs implementation taken from: https://svelte.dev/repl/8e68120858e5322272dc9136c4bb79cc?version=3.7.0

  export const ConsoleContextKey = 'console';

  // Define the interface for the context
  export interface ConsoleContext {
    expanded: import('svelte/store').Writable<boolean>;
  }
</script>

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import ChevronUpIcon from '@nasa-jpl/stellar/icons/chevron_up.svg?component';
  import { createEventDispatcher, setContext } from 'svelte';
  import { writable } from 'svelte/store';

  // Props
  export let expanded: boolean = false; // Now a regular prop, not bound
  export let selectedTab: string = 'all'; // Current selected tab

  const dispatch = createEventDispatcher<{
    selectTab: { expand: boolean; tab: string };
    toggle: boolean;
  }>();

  // Create a writable store for expanded state
  const expandedStore = writable(expanded);

  // Update store when prop changes
  $: expandedStore.set(expanded);

  // Set context to provide expanded status to child components
  setContext<ConsoleContext>(ConsoleContextKey, {
    expanded: expandedStore,
  });

  // Public method for external components to open the console
  export function openConsole(tab: string) {
    // Instead of directly changing state, dispatch event to parent
    dispatch('selectTab', { expand: true, tab: tab || 'all' });
  }

  function onSelectTab(value: string | undefined) {
    if (!value) {
      return;
    }

    // If console is collapsed, expand it when tab is clicked
    if (!expanded) {
      dispatch('selectTab', { expand: true, tab: value });
      return;
    }

    // If clicking the same tab while expanded, toggle it closed
    if (selectedTab === value) {
      onToggle();
    } else {
      // Otherwise just select the new tab
      dispatch('selectTab', { expand: true, tab: value });
    }
  }

  function onToggle() {
    dispatch('toggle', !expanded);
  }
</script>

<div class="size-full">
  <div class="flex h-full flex-col bg-[var(--st-gray-15)]">
    <Tabs.Root value={selectedTab} onValueChange={onSelectTab} class="flex h-full flex-col">
      <Tabs.List
        class="bg-sedondary/50 flex h-[28px] shrink-0 items-center justify-between rounded-none border-b border-border py-0"
      >
        <div class="flex w-full items-center justify-between">
          <div class="flex w-full items-center py-[2px]" class:tabs-inactive={!expanded}>
            <slot name="console-tabs" />
          </div>
        </div>
        <div class="ml-auto cursor-pointer pr-3" role="none" on:click|stopPropagation={onToggle}>
          {#if expanded}
            <ChevronDownIcon />
          {:else}
            <ChevronUpIcon />
          {/if}
        </div>
      </Tabs.List>
      <!-- Always render content, it will be hidden by parent's Resizable pane -->
      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </Tabs.Root>
  </div>
</div>
