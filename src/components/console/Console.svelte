<svelte:options immutable={true} />

<script context="module">
  // Tabs implementation taken from: https://svelte.dev/repl/8e68120858e5322272dc9136c4bb79cc?version=3.7.0

  export const ConsoleContextKey = 'console';
</script>

<script lang="ts">
  import { Resizable, Tabs } from '@nasa-jpl/stellar-svelte';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import ChevronUpIcon from '@nasa-jpl/stellar/icons/chevron_up.svg?component';
  import { createEventDispatcher, onMount, setContext } from 'svelte';

  export let paneApi: any = null; // Accept pane API from parent
  export let isExpanded: boolean = false; // Make this bindable

  export function openConsole(value: string) {
    // default to 'all' and record last active tab
    const tab = value || 'all';
    lastActiveTab = tab;
    currentSelectedConsoleIndex = tab;
    isExpanded = true;

    // Use pane API to expand the console
    if (paneApi) {
      paneApi.expand();
    }

    dispatch('toggle', true);
  }

  // Method called by parent when console is collapsed by dragging
  export function clearTabSelection() {
    if (currentSelectedConsoleIndex) {
      lastActiveTab = currentSelectedConsoleIndex;
      currentSelectedConsoleIndex = '';
    }
  }

  const dispatch = createEventDispatcher<{
    resize: string;
    toggle: boolean;
  }>();

  let currentSelectedConsoleIndex: string = '';
  let lastActiveTab: string = '';

  // We'll use the isExpanded binding for state management instead of event listeners
  onMount(() => {
    // Initialize console state
    if (!isExpanded) {
      currentSelectedConsoleIndex = '';
    } else if (currentSelectedConsoleIndex === '') {
      // Default to 'all' tab when first expanded
      currentSelectedConsoleIndex = 'all';
    }
  });

  // Set context to provide isExpanded status to child components
  setContext('console', {
    isExpanded: () => isExpanded,
  });

  function onSelectTab(value: string | undefined) {
    if (!value) {
      return;
    }

    if (currentSelectedConsoleIndex === value && isExpanded) {
      onToggle();
    } else {
      lastActiveTab = value;
      currentSelectedConsoleIndex = value;
      isExpanded = true;
      if (paneApi) {
        paneApi.expand();
      }
      dispatch('toggle', true);
    }
  }

  function onToggle() {
    isExpanded = !isExpanded;

    // Use pane API for collapsing/expanding
    if (paneApi) {
      if (isExpanded) {
        paneApi.expand();
        // Restore the last active tab when expanding without clicking a tab
        if (lastActiveTab && currentSelectedConsoleIndex === '') {
          currentSelectedConsoleIndex = lastActiveTab;
        } else if (currentSelectedConsoleIndex === '') {
          // Default to 'all' if no previous tab was active
          currentSelectedConsoleIndex = 'all';
        }
      } else {
        paneApi.collapse();
        // Remember the last active tab but deselect it visually
        if (currentSelectedConsoleIndex) {
          lastActiveTab = currentSelectedConsoleIndex;
          currentSelectedConsoleIndex = '';
        }
      }
    }

    dispatch('toggle', isExpanded);
  }

  // reactive: when console is expanded externally (e.g. by dragging), restore or default tab
  $: if (isExpanded && currentSelectedConsoleIndex === '') {
    currentSelectedConsoleIndex = lastActiveTab || 'all';
  }
</script>

<div class="size-full">
  <Resizable.PaneGroup direction="vertical">
    <Resizable.Pane>
      <div class="flex h-full flex-col bg-[var(--st-gray-15)]">
        <Tabs.Root value={currentSelectedConsoleIndex} onValueChange={onSelectTab} class="flex h-full flex-col">
          <Tabs.List class="flex h-[24px] shrink-0 items-center justify-between py-0">
            <div class="flex w-full items-center justify-between">
              <div class="flex w-full items-center" class:tabs-inactive={!isExpanded}>
                <slot name="console-tabs" />
              </div>
            </div>
            <div class="ml-auto cursor-pointer pr-3" role="none" on:click|stopPropagation={onToggle}>
              {#if isExpanded}
                <ChevronDownIcon />
              {:else}
                <ChevronUpIcon />
              {/if}
            </div>
          </Tabs.List>
          {#if isExpanded}
            <div class="flex-1 overflow-y-auto">
              <slot />
            </div>
          {/if}
        </Tabs.Root>
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>
</div>
