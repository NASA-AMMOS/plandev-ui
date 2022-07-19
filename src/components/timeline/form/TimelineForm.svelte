<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import {
    selectedLayer,
    selectedLayerId,
    selectedRow,
    selectedRowId,
    selectedTimeline,
    selectedTimelineId,
    selectedYAxisId,
    view,
    viewSetSelectedRow,
    viewSetSelectedTimeline,
    viewUpdateLayer,
    viewUpdateRow,
    viewUpdateTimeline,
  } from '../../../stores/views';
  import { getTarget } from '../../../utilities/generic';
  import GridMenu from '../../menus/GridMenu.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import Details from '../../ui/Details.svelte';
  import Panel from '../../ui/Panel.svelte';
  import LayerLineForm from './LayerLineForm.svelte';
  import LayerXRangeForm from './LayerXRangeForm.svelte';
  import YAxisForm from './YAxisForm.svelte';

  export let gridId: number;

  function updateRowEvent(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    viewUpdateRow(name, value);
  }

  function updateTimelineEvent(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    viewUpdateTimeline(name, value);
  }

  onMount(() => {
    if ($selectedTimelineId === null) {
      const firstTimeline = $view.definition.plan.timelines[0];
      if (firstTimeline) {
        viewSetSelectedTimeline(firstTimeline.id);
      }
    }
  });
</script>

<Panel borderLeft>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Timeline" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <!-- Select Timeline. -->
    <fieldset>
      <select
        class="st-select w-100"
        data-type="number"
        name="timelines"
        value={$selectedTimelineId}
        on:change={e => {
          const { valueAsNumber: id } = getTarget(e);
          viewSetSelectedTimeline(id);
        }}
      >
        {#each $view.definition.plan.timelines as timeline}
          <option value={timeline.id}>
            Timeline {timeline.id}
          </option>
        {/each}
      </select>
    </fieldset>

    <!-- Timeline. -->
    <Details class="pb-3">
      <span slot="summary-left"> Timeline </span>

      {#if !$selectedTimeline}
        <fieldset>No timeline selected</fieldset>
      {:else}
        <CssGrid columns="1fr 1fr 1fr">
          <!-- Timeline Margin Left. -->
          <fieldset>
            <label for="marginLeft">Margin Left</label>
            <input
              class="st-input w-100"
              name="marginLeft"
              type="number"
              value={$selectedTimeline.marginLeft}
              on:input={updateTimelineEvent}
            />
          </fieldset>

          <!-- Timeline Margin Right. -->
          <fieldset>
            <label for="marginRight">Margin Right</label>
            <input
              class="st-input w-100"
              name="marginRight"
              type="number"
              value={$selectedTimeline.marginRight}
              on:input={updateTimelineEvent}
            />
          </fieldset>

          <!-- Timeline Rows. -->
          <fieldset>
            <label for="rows">Rows</label>
            <select
              class="st-select w-100"
              data-type="number"
              name="rows"
              value={$selectedRowId}
              on:change={e => {
                const { valueAsNumber: id } = getTarget(e);
                viewSetSelectedRow(id);
              }}
            >
              {#each $selectedTimeline.rows as row}
                <option value={row.id}>
                  {row.id}
                </option>
              {/each}
            </select>
          </fieldset>
        </CssGrid>
      {/if}
    </Details>

    <!-- Row. -->
    <Details class="pb-3">
      <span slot="summary-left"> Row </span>

      {#if !$selectedRow}
        <fieldset>No row selected</fieldset>
      {:else}
        <CssGrid columns="1fr 1fr 1fr">
          <!-- Row Height. -->
          <fieldset>
            <label for="height">Height</label>
            <input
              class="st-input w-100"
              name="height"
              type="number"
              value={$selectedRow.height}
              on:input={updateRowEvent}
            />
          </fieldset>

          <!-- Row Y-Axes. -->
          <fieldset>
            <label for="yAxes">Y-Axes</label>
            <select
              bind:value={$selectedYAxisId}
              class="st-select w-100"
              disabled={!$selectedRow.yAxes.length}
              name="yAxes"
            >
              {#each $selectedRow.yAxes as yAxis}
                <option value={yAxis.id}>
                  {yAxis.id}
                </option>
              {/each}
            </select>
          </fieldset>

          <!-- Row Layers. -->
          <fieldset>
            <label for="layers">Layers</label>
            <select
              bind:value={$selectedLayerId}
              class="st-select w-100"
              disabled={!$selectedRow.layers.length}
              name="layers"
            >
              {#each $selectedRow.layers as layer}
                <option value={layer.id}>
                  {layer.id}
                </option>
              {/each}
            </select>
          </fieldset>
        </CssGrid>
      {/if}
    </Details>

    <!-- Y-Axis. -->
    <Details class="pb-3">
      <span slot="summary-left"> Y-Axis </span>

      <YAxisForm />
    </Details>

    <!-- Layer. -->
    <Details>
      <span slot="summary-left"> Layer </span>

      {#if !$selectedLayer}
        <fieldset>No layer selected</fieldset>
      {:else}
        <!-- Layer Chart Type. -->
        <fieldset>
          <label for="chartType">Chart Type</label>
          <select class="st-select w-100" name="chartType" value={$selectedLayer.chartType} on:change={viewUpdateLayer}>
            <option value="activity"> Activity </option>
            <option value="line"> Line </option>
            <option value="x-range"> X-Range </option>
          </select>
        </fieldset>

        <LayerLineForm />

        <LayerXRangeForm />
      {/if}
    </Details>
  </svelte:fragment>
</Panel>
