<svelte:options immutable={false} />

<script context="module">
  // Tabs implementation taken from: https://svelte.dev/repl/8e68120858e5322272dc9136c4bb79cc?version=3.7.0

  export const TabContextKey = 'tabs';
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import TabList from './TabList.svelte';

  const dispatch = createEventDispatcher();

  const tabs: TabId[] = [];
  const panels: PanelId[] = [];
  const selectedTab = writable<TabId>(null);
  const selectedPanel = writable<PanelId>(null);

  setContext<TabContext>(TabContextKey, {
    registerPanel: (panelId: PanelId) => {
      panels.push(panelId);
      selectedPanel.update(current => current || panelId);

      onDestroy(() => {
        const i = panels.indexOf(panelId);
        panels.splice(i, 1);
        selectedPanel.update(current => (current === panelId ? panels[i] || panels[panels.length - 1] : current));
      });
    },
    registerTab: (tabId: TabId) => {
      const existingTab = tabs.find(existingTabId => tabId === existingTabId);
      if (existingTab) {
        console.error(`Tab ID "${existingTab}" already exists. Please provide a unique tab ID.`);
      } else {
        tabs.push(tabId);
        selectedTab.update(current => current || tabId);

        onDestroy(() => {
          const i = tabs.indexOf(tabId);
          tabs.splice(i, 1);
          selectedTab.update(current => (current === tabId ? tabs[i] || tabs[tabs.length - 1] : current));
        });
      }
    },
    selectTab: (tabId: TabId) => {
      const i = tabs.indexOf(tabId);
      selectedTab.set(tabId);
      selectedPanel.set(panels[i]);

      dispatch('select-tab', tabId);
    },
    selectedPanel,
    selectedTab,
  });
</script>

<div class="tabs">
  <TabList>
    <slot name="tab-list" />
  </TabList>
  <div class="tab-panels">
    <slot />
  </div>
</div>

<style>
  .tabs {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
    overflow: inherit;
    width: 100%;
  }

  .tab-panels {
    height: 100%;
    overflow: inherit;
  }
</style>
