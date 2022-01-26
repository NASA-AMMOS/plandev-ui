<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ActivityType } from '../../types';
  import Input from '../form/Input.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import { compare } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  const dispatch = createEventDispatcher();

  export let activityTypes: ActivityType[] = [];

  let searchText: string = '';

  $: filteredActivityTypes = activityTypes.filter(({ name }) =>
    name.toLowerCase().includes(searchText.toLowerCase()),
  );
  $: sortedActivityTypes = filteredActivityTypes.sort((a, b) =>
    compare(a.name, b.name),
  );

  function createActivity(activityType: ActivityType): void {
    dispatch('createActivity', activityType);
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

<div class="p-1">
  <fieldset class="w-100 m-0 p-0 pb-1">
    <label for="search">Find an Activity Type</label>
    <Input>
      <i class="bi bi-search" slot="left" />
      <input bind:value={searchText} class="st-input w-100" name="search" />
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
            on:click={() => createActivity(activityType)}
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
</div>
