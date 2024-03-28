<svelte:options immutable={false} />

<script context="module">
  // Tabs implementation taken from: https://svelte.dev/repl/8e68120858e5322272dc9136c4bb79cc?version=3.7.0

  export const DefaultTabContextKey = 'tabs';
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import type { PanelId, TabContext, TabId } from '../../../types/tabs';
  import { classNames } from '../../../utilities/generic';
  import TabList from './TabList.svelte';

  export { className as class };
  export let tabContextKey: string = DefaultTabContextKey;
  export let tabListClassName: string | undefined = undefined;

  let className: string = '';

  const dispatch = createEventDispatcher<{
    'select-tab': {
      id: TabId;
      index: number;
    };
  }>();

  const tabs: TabId[] = [];
  const panels: PanelId[] = [];
  const selectedTab = writable<TabId>();
  const selectedPanel = writable<PanelId>();

  function unregisterPanel(panelId: PanelId) {
    const i = panels.indexOf(panelId);
    panels.splice(i, 1);
    selectedPanel.update(current => (current === panelId ? panels[i] || panels[panels.length - 1] : current));
  }

  function unregisterTab(tabId: TabId) {
    const i = tabs.indexOf(tabId);
    tabs.splice(i, 1);
    selectedTab.update(current => (current === tabId ? tabs[i] || tabs[tabs.length - 1] : current));
  }

  const tabContext = setContext<TabContext>(tabContextKey, {
    registerPanel: (panelId: PanelId) => {
      panels.push(panelId);
      selectedPanel.update(current => current || panelId);

      onDestroy(() => {
        unregisterPanel(panelId);
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
          unregisterTab(tabId);
        });
      }
    },
    selectTab: (tabId: TabId) => {
      const i = tabs.indexOf(tabId);
      selectedTab.set(tabId);
      selectedPanel.set(panels[i]);

      dispatch('select-tab', {
        id: tabId,
        index: i,
      });
    },
    selectedPanel,
    selectedTab,
    unregisterPanel,
    unregisterTab,
  });

  export function selectTab(tabId: TabId) {
    tabContext.selectTab(tabId);
  }
</script>

<div class={classNames('tabs', { [className]: !!className })}>
  <TabList class={tabListClassName}>
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
