<svelte:options immutable={true} />

<script lang="ts">
  import type { TabId } from '../../types/tabs';
  import { tooltip } from '../../utilities/tooltip';
  import Tab from '../ui/Tabs/Tab.svelte';
  import { ConsoleContextKey } from './Console.svelte';

  export let numberOfErrors: number = 0;
  export let title: string;
  export let tabId: TabId = {};

  let tab: Tab;
</script>

<Tab tabContextKey={ConsoleContextKey} {tabId} bind:this={tab}>
  <div class="error-tab" class:has-error={numberOfErrors > 0} use:tooltip={{ content: title, placement: 'top' }}>
    <slot /><span class="error-number-display">{numberOfErrors}</span>
  </div>
</Tab>

<style>
  .error-tab {
    align-items: center;
    column-gap: 0.5rem;
    display: grid;
    font-weight: 500;
    grid-template-columns: repeat(2, min-content);
  }

  .has-error,
  .has-error .error-number-display {
    color: var(--st-error-red);
  }

  .error-number-display {
    background-color: var(--st-gray-20);
    border-radius: 11px;
    color: var(--st-gray-60);
    padding: 0 4px;
  }
</style>
