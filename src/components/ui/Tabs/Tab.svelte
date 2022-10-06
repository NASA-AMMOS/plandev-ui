<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte';
  import { TabContextKey } from './Tabs.svelte';

  export { className as class };
  export let tabId: TabId = {};

  const { registerTab, selectTab, selectedTab } = getContext<TabContext>(TabContextKey);

  let className: string = '';

  function onSelectTab() {
    selectTab(tabId);
  }

  registerTab(tabId);
</script>

<button class={className} class:selected={$selectedTab === tabId} on:click={onSelectTab}>
  <slot />
</button>

<style>
  button {
    background-color: var(--tab-background-color, var(--st-primary-inverse-background-color));
    border: none;
    color: var(--tab-text-color, var(--st-gray-60));
    cursor: pointer;
    height: var(--tab-height, 36px);
    line-height: 1rem;
    margin: 0;
    padding: 10px 1rem;
  }

  button:hover {
    background-color: var(--tab-hover-background-color, var(--st-gray-15));
  }

  button.selected {
    background-color: var(--tab-selected-background-color, var(--st-gray-20));
    color: var(--tab-selected-text-color, var(--st-gray-100));
  }
</style>
