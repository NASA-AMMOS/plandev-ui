<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import BookIcon from '@nasa-jpl/stellar/icons/book.svg?component';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import ChecklistOnPageIcon from '@nasa-jpl/stellar/icons/checklist_on_page.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import TableWithHeaderIcon from '@nasa-jpl/stellar/icons/table_with_header.svg?component';
  import VerticalCollapseIcon from '@nasa-jpl/stellar/icons/vertical_collapse_with_center_line.svg?component';
  import CodeSquareIcon from 'bootstrap-icons/icons/code-square.svg?component';
  import GearWideConnectedIcon from 'bootstrap-icons/icons/gear-wide-connected.svg?component';
  import WindowFullscreenIcon from 'bootstrap-icons/icons/window-fullscreen.svg?component';
  import { viewUpdateGrid } from '../../stores/views';
  import type { ViewGrid, ViewGridComponent, ViewGridSection } from '../../types/view';
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';

  export let gridSection: ViewGridSection;
  export let title: string = '';

  let gridMenu: Menu;

  function onClickMenuItem(gridComponent: ViewGridComponent): void {
    const update: Partial<ViewGrid> = {};

    if (gridSection === 'LeftTop') {
      update.leftComponentTop = gridComponent;
    } else if (gridSection === 'LeftBottom') {
      update.leftComponentBottom = gridComponent;
    } else if (gridSection === 'MiddleBottom') {
      update.middleComponentBottom = gridComponent;
    } else if (gridSection === 'RightTop') {
      update.rightComponentTop = gridComponent;
    } else if (gridSection === 'RightBottom') {
      update.rightComponentBottom = gridComponent;
    }

    viewUpdateGrid(update);
  }
</script>

<div class="grid-menu st-typography-medium" role="none" on:click|stopPropagation={() => gridMenu.toggle()}>
  <div class="title">{title}</div>
  <ChevronDownIcon />

  <Menu bind:this={gridMenu}>
    <MenuItem on:click={() => onClickMenuItem('ActivityDirectivesTablePanel')}>
      <TableWithHeaderIcon />
      Activity Directives Table
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('ActivitySpansTablePanel')}>
      <TableWithHeaderIcon />
      Simulated Activities Table
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('ActivityTypesPanel')}>
      <BookIcon />
      Activity Types
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('ConstraintsPanel')}>
      <VerticalCollapseIcon />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('ExpansionPanel')}>
      <CodeSquareIcon />
      Expansion
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('IFramePanel')}>
      <WindowFullscreenIcon />
      External Application
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('PlanMetadataPanel')}>
      <PlanIcon />
      Plan Metadata
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('SchedulingGoalsPanel')}>
      <CalendarIcon />
      Scheduling Goals
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('SchedulingConditionsPanel')}>
      <CalendarIcon />
      Scheduling Conditions
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('ActivityFormPanel')}>
      <ActivityIcon />
      Selected Activity
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('SimulationPanel')}>
      <GearWideConnectedIcon />
      Simulation
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('SimulationEventsPanel')}>
      <TableWithHeaderIcon />
      Simulation Events Table
    </MenuItem>
    <MenuItem on:click={() => onClickMenuItem('TimelineEditorPanel')}>
      <ChecklistOnPageIcon />
      Timeline Editor
    </MenuItem>
  </Menu>
</div>

<style>
  .grid-menu {
    align-items: center;
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    font-size: 13px;
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
