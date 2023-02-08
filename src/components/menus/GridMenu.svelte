<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import BookIcon from '@nasa-jpl/stellar/icons/book.svg?component';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import ChecklistOnPageIcon from '@nasa-jpl/stellar/icons/checklist_on_page.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import TableWithHeaderIcon from '@nasa-jpl/stellar/icons/table_with_header.svg?component';
  import TimelineIcon from '@nasa-jpl/stellar/icons/timeline.svg?component';
  import BracesAsteriskIcon from 'bootstrap-icons/icons/braces-asterisk.svg?component';
  import CodeSquareIcon from 'bootstrap-icons/icons/code-square.svg?component';
  import CodeIcon from 'bootstrap-icons/icons/code.svg?component';
  import FileEarmarkExcelIcon from 'bootstrap-icons/icons/file-earmark-excel.svg?component';
  import GearWideConnectedIcon from 'bootstrap-icons/icons/gear-wide-connected.svg?component';
  import WindowFullscreenIcon from 'bootstrap-icons/icons/window-fullscreen.svg?component';
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
    } else if (name === 'IFramePanel') {
      update.iFrameId = 0;
    } else if (name === 'TimelinePanel') {
      update.timelineId = 0;
    }

    viewUpdateLayout(gridId, update);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="grid-menu st-typography-medium" on:click|stopPropagation={() => gridMenu.toggle()}>
  <div class="title">{title}</div>
  <ChevronDownIcon />

  <Menu bind:this={gridMenu}>
    <MenuItem on:click={() => updateGridComponent('ActivityTablePanel')}>
      <TableWithHeaderIcon />
      Activity Table
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ActivityTypesPanel')}>
      <BookIcon />
      Activity Types
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ConstraintsPanel')}>
      <BracesAsteriskIcon />
      Constraints
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ConstraintViolationsPanel')}>
      <FileEarmarkExcelIcon />
      Constraint Violations
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ExpansionPanel')}>
      <CodeSquareIcon />
      Expansion
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('IFramePanel')}>
      <WindowFullscreenIcon />
      External Application
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('SchedulingGoalsPanel')}>
      <CalendarIcon />
      Scheduling Goals
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('SchedulingConditionsPanel')}>
      <CalendarIcon />
      Scheduling Conditions
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ActivityFormPanel')}>
      <ActivityIcon />
      Selected Activity
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('SimulationPanel')}>
      <GearWideConnectedIcon />
      Simulation
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('TimelinePanel')}>
      <TimelineIcon />
      Timeline
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('TimelineEditorPanel')}>
      <ChecklistOnPageIcon />
      Timeline Editor
    </MenuItem>
    <MenuItem on:click={() => updateGridComponent('ViewEditorPanel')}>
      <CodeIcon />
      View Editor
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
