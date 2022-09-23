<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import Input from '../../../components/form/Input.svelte';
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

<Panel borderLeft padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Timeline Form" />
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
    <fieldset>
      <details open>
        <summary>Timeline</summary>
        {#if !$selectedTimeline}
          <fieldset>No timeline selected</fieldset>
        {:else}
          <div class="details-body">
            <CssGrid columns="1fr 1fr 1fr" gap="16px">
              <!-- Timeline Margin Left. -->
              <Input>
                <label for="marginLeft">Margin Left</label>
                <input
                  class="st-input w-100"
                  name="marginLeft"
                  type="number"
                  value={$selectedTimeline.marginLeft}
                  on:input={updateTimelineEvent}
                />
              </Input>

              <!-- Timeline Margin Right. -->
              <Input>
                <label for="marginRight">Margin Right</label>
                <input
                  class="st-input w-100"
                  name="marginRight"
                  type="number"
                  value={$selectedTimeline.marginRight}
                  on:input={updateTimelineEvent}
                />
              </Input>

              <!-- Timeline Rows. -->
              <Input>
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
              </Input>
            </CssGrid>
          </div>
        {/if}
      </details>
    </fieldset>

    <!-- Row. -->
    <fieldset>
      <details open>
        <summary>Row</summary>
        {#if !$selectedRow}
          <fieldset>No row selected</fieldset>
        {:else}
          <div class="details-body">
            <CssGrid columns="1fr 1fr 1fr" gap="16px">
              <!-- Row Height. -->
              <Input>
                <label for="height">Height</label>
                <input
                  class="st-input w-100"
                  name="height"
                  type="number"
                  value={$selectedRow.height}
                  on:input={updateRowEvent}
                />
              </Input>

              <!-- Row Y-Axes. -->
              <Input>
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
              </Input>

              <!-- Row Layers. -->
              <Input>
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
              </Input>
            </CssGrid>
          </div>
        {/if}
      </details>
    </fieldset>

    <!-- Y-Axis. -->
    <fieldset>
      <details open>
        <summary>Y-Axis</summary>
        <div class="details-body">
          <YAxisForm />
        </div>
      </details>
    </fieldset>

    <!-- Layer. -->
    <fieldset>
      <details open>
        <summary>Layer</summary>
        {#if !$selectedLayer}
          <fieldset>No layer selected</fieldset>
        {:else}
          <div class="details-body">
            <!-- Layer Chart Type. -->
            <div style="display:block; margin-bottom: 8px">
              <Input>
                <label for="chartType">Chart Type</label>
                <select
                  class="st-select w-100"
                  name="chartType"
                  value={$selectedLayer.chartType}
                  on:change={viewUpdateLayer}
                >
                  <option value="activity"> Activity </option>
                  <option value="line"> Line </option>
                  <option value="x-range"> X-Range </option>
                </select>
              </Input>
            </div>

            <LayerLineForm />

            <LayerXRangeForm />
          </div>
        {/if}
      </details>
    </fieldset>
  </svelte:fragment>
</Panel>
