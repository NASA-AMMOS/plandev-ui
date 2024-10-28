<svelte:options immutable={true} />

<script lang="ts">
  import { externalEventTypes, selectedExternalEvent } from '../../stores/external-event';
  import { plan } from '../../stores/plan';
  import type { ExternalEventType } from '../../types/external-event';
  import type { ParametersMap } from '../../types/parameter';
  import type { ViewGridSection } from '../../types/view';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExternalEventForm from './ExternalEventForm.svelte';

  export let gridSection: ViewGridSection;

  let selectedEventTypeMetadata: ParametersMap;
  let selectedEventRequiredMetadataList: string[];

  $: if ($selectedExternalEvent !== null) {
    console.log($selectedExternalEvent);
    if ($selectedExternalEvent.metadata !== null && Object.entries($selectedExternalEvent.metadata).length > 0) {
      const selectedEventType: ExternalEventType | undefined = $externalEventTypes.find(
        eventType => eventType.name === $selectedExternalEvent?.pkey.event_type_name
      );
      if (selectedEventType !== undefined) {
        selectedEventTypeMetadata = selectedEventType.metadata;
        selectedEventRequiredMetadataList = selectedEventType.required_metadata;
      }
    }
  }

</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Selected External Event" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $selectedExternalEvent && $plan !== null}
      <ExternalEventForm
        externalEvent={$selectedExternalEvent}
        parametersMap={selectedEventTypeMetadata}
        argumentsMap={$selectedExternalEvent.metadata}
        requiredParameters={selectedEventRequiredMetadataList}
        showHeader={true}
      />
    {:else}
      <div class="p-2 st-typography-label">No External Event Selected</div>
    {/if}
  </svelte:fragment>
</Panel>
