<svelte:options immutable={true} />

<script lang="ts">
  import { plan } from '../../stores/plan';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  let activityTypes: ActivityType[] = $plan.model.activity_types;
  let filterText: string = '';

  $: filteredActivityTypes = activityTypes.filter(({ name }) => name.toLowerCase().includes(filterText.toLowerCase()));
  $: sortedActivityTypes = filteredActivityTypes.sort((a, b) => compare(a.name, b.name));

  async function createActivityDirectiveAtPlanStart(activityType: ActivityType) {
    const { start_time } = $plan;
    effects.createActivityDirective({}, start_time, activityType.name);
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
    <GridMenu {gridId} title="Activity Types" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset class="w-100 m-0 p-0 pb-2">
      <input bind:value={filterText} class="st-input w-100" name="search" placeholder="Filter activity types" />
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
              on:click={() => createActivityDirectiveAtPlanStart(activityType)}
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
