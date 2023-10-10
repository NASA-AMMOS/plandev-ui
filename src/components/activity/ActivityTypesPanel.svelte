<svelte:options immutable={true} />

<script lang="ts">
  import PlusIcon from 'bootstrap-icons/icons/plus.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { activityTypes, plan, planReadOnly } from '../../stores/plan';
  import type { ActivityType } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  let filterText: string = '';
  let hasPermission: boolean = false;

  $: permissionError = $planReadOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to add an activity.';
  $: if ($plan !== null) {
    hasPermission = featurePermissions.activityDirective.canCreate(user, $plan) && !$planReadOnly;
  }
  $: filteredActivityTypes = ($activityTypes ?? []).filter(({ name }) =>
    name.toLowerCase().includes(filterText.toLowerCase()),
  );

  async function createActivityDirectiveAtPlanStart(activityType: ActivityType) {
    if ($plan !== null) {
      const { start_time_doy } = $plan;
      effects.createActivityDirective({}, start_time_doy, activityType.name, activityType.name, {}, user);
    }
  }

  function onDragEnd(): void {
    document.getElementById('list-item-drag-image')?.remove();
  }

  function onDragStart(event: DragEvent, activityType: ActivityType): void {
    const dragImage = document.createElement('div');
    const text = document.createTextNode(activityType.name);
    dragImage.appendChild(text);
    dragImage.id = 'list-item-drag-image';
    dragImage.style.padding = '10px';
    dragImage.style.color = 'rgba(0, 0, 0, 0.8)';
    document.body.appendChild(dragImage);
    event.dataTransfer?.setDragImage(dragImage, 0, 0);
    event.dataTransfer?.setData('activityTypeName', activityType.name);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Activity Types" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <fieldset class="w-100 m-0 p-0 pb-2">
      <input bind:value={filterText} class="st-input w-100" name="search" placeholder="Filter activity types" />
    </fieldset>

    {#if filteredActivityTypes.length}
      {#each filteredActivityTypes as activityType}
        <ListItem
          draggable
          style="cursor: move;"
          {hasPermission}
          {permissionError}
          on:dragend={onDragEnd}
          on:dragstart={e => onDragStart(e.detail, activityType)}
        >
          {activityType.name}
          <span slot="suffix">
            <button
              aria-label="CreateActivity-{activityType.name}"
              class="st-button icon"
              on:click={() => createActivityDirectiveAtPlanStart(activityType)}
              disabled={!hasPermission}
              use:tooltip={{ content: 'Create Activity', placement: 'left' }}
            >
              <PlusIcon />
            </button>
          </span>
        </ListItem>
      {/each}
    {:else}
      <ListItem>No Activity Types Found</ListItem>
    {/if}
  </svelte:fragment>>
</Panel>
