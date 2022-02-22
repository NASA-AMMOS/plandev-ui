<svelte:options immutable={true} />

<script lang="ts">
  import Input from '../form/Input.svelte';
  import Chip from '../stellar/Chip.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';
  import { createActivity, selectActivity } from '../../stores/activities';
  import { SimulationStatus, simulationStatus } from '../../stores/simulation';
  import { plan } from '../../stores/plan';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  let activityTypes: ActivityType[] = $plan.model.activityTypes;
  let filterText: string = '';

  $: filteredActivityTypes = activityTypes.filter(({ name }) =>
    name.toLowerCase().includes(filterText.toLowerCase()),
  );
  $: sortedActivityTypes = filteredActivityTypes.sort((a, b) =>
    compare(a.name, b.name),
  );

  async function onCreateActivity(activityType: ActivityType): Promise<void> {
    const { id: planId, startTime } = $plan;
    const activity: CreateActivity = {
      arguments: {},
      startTime,
      type: activityType.name,
    };
    const { id, success } = await createActivity(activity, planId, startTime);

    if (success) {
      selectActivity(id);
      simulationStatus.update(SimulationStatus.Dirty);
    }
  }

  function onDragEnd(): void {
    document.getElementById('list-item-drag-image').remove();
  }

  function onDragStart(event: DragEvent, activityType: ActivityType): void {
    const dragImage = document.createElement('div');
    const text = document.createTextNode(activityType.name);
    dragImage.appendChild(text);
    dragImage.id = 'list-item-drag-image';
    dragImage.style.padding = '10px';
    dragImage.style.color = 'rgba(0, 0, 0, 0.8)';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    event.dataTransfer.setData('activityTypeName', activityType.name);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Activity Dictionary</Chip>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset class="w-100 m-0 p-0 pb-2">
      <Input>
        <i class="bi bi-search" slot="left" />
        <input
          bind:value={filterText}
          class="st-input w-100"
          name="search"
          placeholder="Filter activity types"
        />
      </Input>
    </fieldset>

    {#if sortedActivityTypes.length}
      {#each sortedActivityTypes as activityType}
        <ListItem
          draggable
          style="cursor: move;"
          on:dragend={onDragEnd}
          on:dragstart={e => onDragStart(e.detail, activityType)}
        >
          {activityType.name}
          <span slot="suffix">
            <button
              class="st-button icon fs-6"
              on:click={() => onCreateActivity(activityType)}
              use:tooltip={{ content: 'Create Activity', placement: 'left' }}
            >
              <i class="bi bi-plus" />
            </button>
          </span>
        </ListItem>
      {/each}
    {:else}
      <ListItem>No Activity Types Found</ListItem>
    {/if}
  </svelte:fragment>>
</Panel>
