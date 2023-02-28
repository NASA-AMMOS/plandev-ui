<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ViewGridComponent } from '../../types/view';
  import ActivityFormPanel from '../activity/ActivityFormPanel.svelte';
  import ActivityTablePanel from '../activity/ActivityTablePanel.svelte';
  import ActivityTypesPanel from '../activity/ActivityTypesPanel.svelte';
  import ConstraintsPanel from '../constraints/ConstraintsPanel.svelte';
  import ConstraintViolationsPanel from '../constraints/ConstraintViolationsPanel.svelte';
  import ExpansionPanel from '../expansion/ExpansionPanel.svelte';
  import SchedulingConditionsPanel from '../scheduling/SchedulingConditionsPanel.svelte';
  import SchedulingGoalsPanel from '../scheduling/SchedulingGoalsPanel.svelte';
  import SimulationPanel from '../simulation/SimulationPanel.svelte';
  import TimelineEditorPanel from '../timeline/form/TimelineEditorPanel.svelte';
  import TimelinePanel from '../timeline/TimelinePanel.svelte';
  import CssGrid from './CssGrid.svelte';
  import CssGridGutter from './CssGridGutter.svelte';
  import IFramePanel from './IFramePanel.svelte';

  export let columnSizes: string = '1fr 3px 3fr 3px 1fr';
  export let leftComponentBottom: ViewGridComponent = 'SimulationPanel';
  export let leftComponentTop: ViewGridComponent = 'ActivityTypesPanel';
  export let leftHidden: boolean = false;
  export let leftRowSizes: string = '1fr 3px 1fr';
  export let leftSplit: boolean = false;
  export let middleComponentBottom: ViewGridComponent = 'ActivityTablePanel';
  export let middleRowSizes: string = '2fr 3px 1fr';
  export let middleSplit: boolean = true;
  export let rightComponentBottom: ViewGridComponent = 'TimelineEditorPanel';
  export let rightComponentTop: ViewGridComponent = 'ActivityFormPanel';
  export let rightHidden: boolean = false;
  export let rightRowSizes: string = '1fr 3px 1fr';
  export let rightSplit: boolean = false;

  const dispatch = createEventDispatcher();

  const gridComponentsByName: Record<ViewGridComponent, any> = {
    ActivityFormPanel,
    ActivityTablePanel,
    ActivityTypesPanel,
    ConstraintViolationsPanel,
    ConstraintsPanel,
    ExpansionPanel,
    IFramePanel,
    SchedulingConditionsPanel,
    SchedulingGoalsPanel,
    SimulationPanel,
    TimelineEditorPanel,
  };

  function onChangeColumnSizes(event: CustomEvent<string>) {
    dispatch('changeColumnSizes', event.detail);
  }

  function onChangeLeftRowSizes(event: CustomEvent<string>) {
    dispatch('changeLeftRowSizes', event.detail);
  }

  function onChangeMiddleRowSizes(event: CustomEvent<string>) {
    dispatch('changeMiddleRowSizes', event.detail);
  }

  function onChangeRightRowSizes(event: CustomEvent<string>) {
    dispatch('changeRightRowSizes', event.detail);
  }
</script>

<CssGrid class="plan-grid" columns={columnSizes} on:changeColumnSizes={onChangeColumnSizes}>
  {#if !leftHidden}
    {#if leftSplit}
      <CssGrid class="plan-grid" rows={leftRowSizes} on:changeRowSizes={onChangeLeftRowSizes}>
        <div class="plan-grid-component" data-component-name={leftComponentTop}>
          <svelte:component this={gridComponentsByName[leftComponentTop]} gridSection="LeftTop" />
        </div>
        <CssGridGutter track={1} type="row" />
        <div class="plan-grid-component" data-component-name={leftComponentBottom}>
          <svelte:component this={gridComponentsByName[leftComponentBottom]} gridSection="LeftBottom" />
        </div>
      </CssGrid>
    {:else}
      <div class="plan-grid-component" data-component-name={leftComponentTop}>
        <svelte:component this={gridComponentsByName[leftComponentTop]} gridSection="LeftTop" />
      </div>
    {/if}

    <CssGridGutter track={1} type="column" />
  {/if}

  {#if middleSplit}
    <CssGrid class="plan-grid" rows={middleRowSizes} on:changeRowSizes={onChangeMiddleRowSizes}>
      <div class="plan-grid-component" data-component-name="TimelinePanel">
        <TimelinePanel />
      </div>
      <CssGridGutter track={1} type="row" />
      <div class="plan-grid-component" data-component-name={middleComponentBottom}>
        <svelte:component this={gridComponentsByName[middleComponentBottom]} gridSection="MiddleBottom" />
      </div>
    </CssGrid>
  {:else}
    <div class="plan-grid-component" data-component-name="TimelinePanel">
      <TimelinePanel />
    </div>
  {/if}

  {#if !rightHidden}
    <CssGridGutter track={leftHidden ? 1 : 3} type="column" />

    {#if rightSplit}
      <CssGrid class="plan-grid" rows={rightRowSizes} on:changeRowSizes={onChangeRightRowSizes}>
        <div class="plan-grid-component" data-component-name={rightComponentTop}>
          <svelte:component this={gridComponentsByName[rightComponentTop]} gridSection="RightTop" />
        </div>
        <CssGridGutter track={1} type="row" />
        <div class="plan-grid-component" data-component-name={rightComponentBottom}>
          <svelte:component this={gridComponentsByName[rightComponentBottom]} gridSection="RightBottom" />
        </div>
      </CssGrid>
    {:else}
      <div class="plan-grid-component" data-component-name={rightComponentTop}>
        <svelte:component this={gridComponentsByName[rightComponentTop]} gridSection="RightTop" />
      </div>
    {/if}
  {/if}
</CssGrid>

<style>
  :global(.plan-grid) {
    overflow: auto;
  }

  .plan-grid-component {
    display: grid;
    height: 100%;
    overflow-y: auto;
    width: 100%;
  }
</style>
