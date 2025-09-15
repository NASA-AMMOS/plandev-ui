<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import { getContext } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';
  import type { ConsoleContext } from './Console.svelte';
  import { ConsoleContextKey } from './Console.svelte';

  export let numberOfErrors: number = 0;
  export let title: string;
  export let value: string;

  // Get expanded state from context
  const consoleContext = getContext<ConsoleContext>(ConsoleContextKey);

  // Get the store from context or use a default value
  const expandedStore = consoleContext?.expanded;

  // Default to true if context is not available
  $: isExpanded = expandedStore ? $expandedStore : true;

  function onClick() {
    // Instead of dispatching an event, call onSelectTab directly
    if (consoleContext?.onSelectTab) {
      consoleContext.onSelectTab(value);
    }
  }
</script>

<Tabs.Trigger
  {value}
  class={`tab-trigger mx-0.5 px-2 ${!isExpanded ? 'data-[state=active]:bg-transparent data-[state=active]:text-gray-500' : ''}`}
  on:click={onClick}
>
  <div
    class="flex h-2 items-center gap-1 text-xs hover:text-neutral-800 data-[state=active]:text-neutral-800"
    use:tooltip={{ content: title, placement: 'top' }}
  >
    <slot />
    {#if numberOfErrors > 0}<span
        class="flex min-w-4 items-center justify-center rounded-full bg-red-50 px-1 text-xs font-semibold text-red-800 ring-1 ring-inset ring-red-900/20"
      >
        {numberOfErrors}
      </span>
    {/if}
  </div>
</Tabs.Trigger>
