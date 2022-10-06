<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte';
  import { TabContextKey } from './Tabs.svelte';

  export let panelId: PanelId = {};

  const { registerPanel, selectedPanel } = getContext<TabContext>(TabContextKey);

  registerPanel(panelId);
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
