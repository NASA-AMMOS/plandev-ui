<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';
  import { viewActions } from '../../stores/views';

  export let gridId: number;
  export let title: string = '';

  let gridMenu: Menu;

  function updateGridComponent(name: string) {
    viewActions.updateLayout(gridId, 'componentName', name);
  }
</script>

<div class="grid-menu" on:click|stopPropagation={() => gridMenu.toggle()}>
  <div class="title">{title}</div>
  <i class="bi bi-chevron-down" style="font-size: 12px;" />

  <Menu bind:this={gridMenu}>
    <MenuItem on:click={() => updateGridComponent('ActivityTypes')}>
      <i class="bi bi-book" />
      Activity Types
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('Constraints')}>
      <i class="bi bi-braces-asterisk" />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ConstraintEditor')}>
      <i class="bi bi-code" />
      Constraint Editor
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ConstraintViolations')}>
      <i class="bi bi-file-earmark-excel" />
      Constraint Violations
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('Scheduling')}>
      <i class="bi bi-calendar3" />
      Scheduling
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('SchedulingEditor')}>
      <i class="bi bi-code" />
      Scheduling Editor
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ActivityForm')}>
      <i class="si si-activity" />
      Selected Activity
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('Simulation')}>
      <i class="bi bi-gear-wide-connected" />
      Simulation
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('TimelineForm')}>
      <i class="bi bi-calendar2-range" />
      Timeline
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('Views')}>
      <i class="bi bi-columns" />
      Views
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ViewEditor')}>
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
    justify-content: center;
    padding: 3px;
    position: relative;
    user-select: none;
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
