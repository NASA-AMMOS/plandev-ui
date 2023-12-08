<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte';
  import type { PanelId, TabContext } from '../../../types/tabs';
  import { DefaultTabContextKey } from './Tabs.svelte';

  export let disabled: boolean = false;
  export let panelId: PanelId = {};
  export let tabContextKey: string = DefaultTabContextKey;

  const { registerPanel, selectedPanel, unregisterPanel } = getContext<TabContext>(tabContextKey);

  $: if (!disabled) {
    registerPanel(panelId);
  } else {
    unregisterPanel(panelId);
  }
</script>

{#if $selectedPanel === panelId}
  <div class="tab-panel">
    <slot />
  </div>
{/if}

<style>
  .tab-panel {
    height: 100%;
  }
</style>
