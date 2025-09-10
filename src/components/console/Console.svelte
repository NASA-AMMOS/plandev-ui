<svelte:options immutable={true} />

<script context="module" lang="ts">
  export const ConsoleContextKey = 'console';

  // Define the interface for the context
  export interface ConsoleContext {
    expanded: import('svelte/store').Writable<boolean>;
    filter: import('svelte/store').Writable<string>;
    onSelectTab: (value: string) => void;
    selectedTab: import('svelte/store').Writable<string>;
  }
</script>

<script lang="ts">
  import { Button, Input as InputStellar, Tabs } from '@nasa-jpl/stellar-svelte';
  import { ChevronDown, ChevronUp, Search, X } from 'lucide-svelte';
  import { createEventDispatcher, onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';

  export let expanded: boolean = false; // Now a regular prop, not bound
  export let selectedTab: string = 'all'; // Current selected tab

  let filter: string = '';
  let isMounted: boolean = false;

  onMount(() => {
    isMounted = true;
  });

  const dispatch = createEventDispatcher<{
    filter: string;
    selectTab: { expand: boolean; tab: string };
    toggle: boolean;
  }>();

  // Create a writable store for expanded state
  const expandedStore = writable(expanded);

  // Update store when prop changes
  $: expandedStore.set(expanded);

  // Create a writable store for filter state
  const filterStore = writable(filter);

  // Update store when prop changes
  $: filterStore.set(filter);

  // Create a writable store for selectedTab state
  const selectedTabStore = writable(selectedTab);

  // Update store when prop changes
  $: selectedTabStore.set(selectedTab);

  // Set context to provide expanded status to child components
  setContext<ConsoleContext>(ConsoleContextKey, {
    expanded: expandedStore,
    filter: filterStore,
    onSelectTab,
    selectedTab: selectedTabStore,
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

  function onClearInput() {
    filter = '';
  }
</script>

<div class="size-full" data-testid="console">
  <div class="flex h-full flex-col bg-secondary">
    <Tabs.Root value={selectedTab} onValueChange={onSelectTab} class="flex h-full flex-col">
      <Tabs.List
        class="flex h-[36px] shrink-0 items-center justify-between rounded-none border-b border-border bg-secondary/50 py-0"
      >
        <div class="flex items-center justify-between">
          <div class="flex w-full items-center py-[2px]" class:tabs-inactive={!expanded}>
            <slot name="console-tabs" />
          </div>
        </div>
        <div class="ml-1 flex flex-1 flex-shrink-0 justify-end gap-1">
          {#if isMounted && expanded}
            <Input class="!w-full min-w-[100px] max-w-[200px]">
              <Search slot="left" size={14} />
              <InputStellar sizeVariant="xs" placeholder="Search" bind:value={filter} class="w-full" />
              <div slot="right" class="flex h-full items-center">
                {#if filter}
                  <Button variant="ghost" size="icon-xs" on:click={onClearInput}>
                    <X size={14} />
                  </Button>
                {/if}
              </div>
            </Input>
          {/if}
          <slot name="console-actions" />
          <div use:tooltip={{ content: expanded ? 'Collapse' : 'Expand' }}>
            <Button
              variant="ghost"
              size="icon"
              class="ml-auto mr-1 flex flex-shrink-0 items-center"
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
