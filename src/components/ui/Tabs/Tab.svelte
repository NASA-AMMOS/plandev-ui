<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte';
  import type { TabContext, TabId } from '../../../types/tabs';
  import { DefaultTabContextKey } from './Tabs.svelte';

  export { className as class };
  export let disabled: boolean = false;
  export let tabContextKey: string = DefaultTabContextKey;
  export let tabId: TabId = {};

  const { registerTab, selectTab, selectedTab, unregisterTab } = getContext<TabContext>(tabContextKey);

  let className: string = '';

  function onSelectTab() {
    selectTab(tabId);
  }

  $: if (!disabled) {
    registerTab(tabId);
  } else {
    unregisterTab(tabId);
  }
</script>

<button class={className} class:selected={$selectedTab === tabId} on:click={onSelectTab} {disabled}>
  <slot />
</button>

<style>
  button {
    background-color: var(--tab-background-color, var(--st-primary-inverse-background-color));
    border: none;
    color: var(--tab-text-color, var(--st-gray-60));
    cursor: pointer;
    font-weight: var(--tab-text-weight, var(--st-typography-medium-font-weight));
    height: var(--tab-height, 36px);
    line-height: 1rem;
    margin: 0;
    padding: var(--tab-padding, 10px 1rem);
    user-select: none;
  }

  button:disabled {
    pointer-events: none;
  }

  button:hover {
    background-color: var(--tab-hover-background-color, var(--st-gray-15));
    color: var(--tab-hover-text-color, var(--st-gray-60));
    font-weight: var(--tab-hover-text-weight, var(--st-typography-medium-font-weight));
  }

  button.selected {
    background-color: var(--tab-selected-background-color, var(--st-gray-20));
    color: var(--tab-selected-text-color, var(--st-gray-100));
    font-weight: var(--tab-selected-text-weight, var(--st-typography-medium-font-weight));
  }
</style>
