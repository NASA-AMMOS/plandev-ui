<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { viewUpdateLayout } from '../../stores/views';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  export let gridId: number;
  export let title: string = '';

  let gridMenu: Menu;

  function updateGridComponent(name: string) {
    const update: Record<string, any> = { componentName: name };

    if (name === 'ActivityTablePanel') {
      update.activityTableId = 0;
    } else if (name === 'TimelinePanel') {
      update.timelineId = 0;
    }

    viewUpdateLayout(gridId, update);
  }
</script>

<div class="grid-menu" on:click|stopPropagation={() => gridMenu.toggle()}>
  <div class="title">{title}</div>
  <i class="bi bi-chevron-down" style="font-size: 12px;" />

  <Menu bind:this={gridMenu}>
    <MenuItem on:click={() => updateGridComponent('ActivityTablePanel')}>
      <i class="bi bi-table" />
      Activity Table
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ActivityTypesPanel')}>
      <i class="bi bi-book" />
      Activity Types
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ConstraintsPanel')}>
      <i class="bi bi-braces-asterisk" />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ConstraintViolationsPanel')}>
      <i class="bi bi-file-earmark-excel" />
      Constraint Violations
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ExpansionPanel')}>
      <i class="bi bi-code-square" />
      Expansion
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('SchedulingPanel')}>
      <i class="bi bi-calendar3" />
      Scheduling
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ActivityFormPanel')}>
      <i class="si si-activity" />
      Selected Activity
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('SimulationPanel')}>
      <i class="bi bi-gear-wide-connected" />
      Simulation
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('TimelinePanel')}>
      <i class="bi bi-calendar2-range" />
      Timeline
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('TimelineFormPanel')}>
      <i class="bi bi-ui-checks" />
      Timeline Form
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ViewsPanel')}>
      <i class="bi bi-columns" />
      Views
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ViewEditorPanel')}>
      <i class="bi bi-code" />
      View Editor
    </MenuItem>
  </Menu>
</div>

<style>
  .bi-chevron-down {
    color: var(--st-gray-60);
  }

  .grid-menu {
    align-items: center;
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    gap: 5px;
    height: 24px;
    justify-content: center;
    padding: 4px 8px;
    position: relative;
    user-select: none;
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
