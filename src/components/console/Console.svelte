<svelte:options immutable={true} />

<script context="module" lang="ts">
  export const ConsoleContextKey = 'console';

  // Define the interface for the context
  export interface ConsoleContext {
    expanded: import('svelte/store').Writable<boolean>;
    onSelectTab: (value: string) => void;
  }
</script>

<script lang="ts">
  import { Button, Tabs } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import { createEventDispatcher, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { tooltip } from '../../utilities/tooltip';

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
    onSelectTab,
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

    // Always expand when any tab is clicked, regardless of state
    if (!expanded) {
      dispatch('selectTab', { expand: true, tab: value });
      return;
    }

    // If already expanded, just select the tab (don't toggle closed)
    dispatch('selectTab', { expand: true, tab: value });
  }

  function onToggle() {
    dispatch('toggle', !expanded);
  }
</script>

<div class="size-full" data-testid="console">
  <div class="flex h-full flex-col bg-[var(--st-gray-15)]">
    <Tabs.Root value={selectedTab} onValueChange={onSelectTab} class="flex h-full flex-col">
      <Tabs.List
        class="flex h-[28px] shrink-0 items-center justify-between rounded-none border-b border-border bg-secondary/50 py-0"
      >
        <div class="flex w-full items-center justify-between">
          <div class="flex w-full items-center py-[2px]" class:tabs-inactive={!expanded}>
            <slot name="console-tabs" />
          </div>
        </div>
        <div class="mr-2 flex gap-1">
          <slot name="console-actions" />
          <div use:tooltip={{ content: expanded ? 'Collapse' : 'Expand' }}>
            <Button
              variant="ghost"
              size="icon"
              class="ml-auto flex flex-shrink-0 items-center"
              role="none"
              on:click={onToggle}
            >
              {#if expanded}
                <ChevronDown size={16} />
              {:else}
                <ChevronUp size={16} />
              {/if}
            </Button>
          </div>
        </div>
      </Tabs.List>
      <!-- Always render content, it will be hidden by parent's Resizable pane -->
      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </Tabs.Root>
  </div>
</div>
