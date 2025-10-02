<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import {
    AppWindow,
    BookOpen,
    Box,
    Boxes,
    CalendarRange,
    ChevronDown,
    ChevronsLeftRight,
    Clipboard,
    FlipHorizontal2,
    LucideEdit,
    PlaySquare,
    Table2,
  } from 'lucide-svelte';
  import DirectiveAndSpanIcon from '../../assets/timeline-directive-and-span.svg?component';
  import { viewUpdateGrid } from '../../stores/views';
  import type { ViewGrid, ViewGridComponent, ViewGridSection } from '../../types/view';

  export let gridSection: ViewGridSection;
  export let title: string = '';

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

<DropdownMenu.Root>
  <DropdownMenu.Trigger aria-label="Plan Menu">
    <div class="flex items-center gap-1 whitespace-nowrap rounded border px-2 py-1 text-[13px] font-medium">
      {title}
      <ChevronDown size={16} />
    </div>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content avoidCollisions fitViewport align="start" class="overflow-auto">
    <DropdownMenu.Label class="mb-0.5 text-[13px] font-medium text-muted-foreground">Select Panel</DropdownMenu.Label>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ActivityDirectivesTablePanel')}
    >
      <Table2 size={16} />
      Activity Directives Table
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ActivitySpansTablePanel')}
    >
      <Table2 size={16} />
      Simulated Activities Table
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('TimelineItemsPanel')}
    >
      <BookOpen size={16} />
      Activity, Resource, Event Types
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ConstraintsPanel')}
    >
      <FlipHorizontal2 size={16} />
      Constraints
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ExpansionPanel')}
    >
      <ChevronsLeftRight size={16} />
      Expansion
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ExternalSourcesPanel')}
    >
      <Boxes size={16} />
      External Sources
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ExternalEventsTablePanel')}
    >
      <Table2 size={16} />
      External Events Table
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('IFramePanel')}
    >
      <AppWindow size={16} />
      External Application
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('PlanMetadataPanel')}
    >
      <Clipboard size={16} />
      Plan Metadata
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('SchedulingGoalsPanel')}
    >
      <CalendarRange size={16} />
      Scheduling Goals
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('SchedulingConditionsPanel')}
    >
      <CalendarRange size={16} />
      Scheduling Conditions
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ActivityFormPanel')}
    >
      <DirectiveAndSpanIcon />
      Selected Activity
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('ExternalEventFormPanel')}
    >
      <Box size={16} />
      Selected External Event
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('SimulationPanel')}
    >
      <PlaySquare size={16} />
      Simulation
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('SimulationEventsPanel')}
    >
      <Table2 size={16} />
      Simulation Events Table
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="flex cursor-pointer select-none items-center gap-2 rounded-sm py-2.5 text-[13px] font-medium"
      on:click={() => onClickMenuItem('TimelineEditorPanel')}
    >
      <LucideEdit size={16} />
      Timeline Editor
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
