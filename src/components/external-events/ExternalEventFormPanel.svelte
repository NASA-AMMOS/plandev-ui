<svelte:options immutable={true} />

<script lang="ts">
  import { selectedExternalEvent } from '../../stores/external-event';
  import { plan } from '../../stores/plan';
  import type { ViewGridSection } from '../../types/view';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExternalEventForm from './ExternalEventForm.svelte';

  export let gridSection: ViewGridSection;
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Selected External Event" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedExternalEvent && $plan !== null}
      <ExternalEventForm externalEvent={$selectedExternalEvent} />
    {:else}
      <div class="st-typography-label p-2">No External Event Selected</div>
    {/if}
  </svelte:fragment>
</Panel>
