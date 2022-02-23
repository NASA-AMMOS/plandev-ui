<svelte:options immutable={true} />

<script lang="ts">
  import LayerLineForm from './LayerLineForm.svelte';
  import LayerXRangeForm from './LayerXRangeForm.svelte';
  import ConfirmModal from '../../modals/Confirm.svelte';
  import Chip from '../../ui/Chip.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import Details from '../../ui/Details.svelte';
  import Panel from '../../ui/Panel.svelte';
  import {
    createYAxis,
    selectedLayerId,
    selectedLayer,
    selectedRowId,
    selectedRow,
    selectedTimeline,
    selectedYAxisId,
    selectedYAxis,
    updateLayer,
    updateRow,
    updateTimeline,
    updateYAxis,
    deleteLayer,
    deleteRow,
    deleteTimeline,
    deleteYAxis,
  } from '../../../stores/views';
  import { getTarget } from '../../../utilities/generic';
  import { tooltip } from '../../../utilities/tooltip';
  import YAxisForm from './YAxisForm.svelte';

  let confirmDeleteLayerModal: ConfirmModal;
  let confirmDeleteRowModal: ConfirmModal;
  let confirmDeleteTimelineModal: ConfirmModal;
  let confirmDeleteYAxisModal: ConfirmModal;

  function updateLayerEvent(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    updateLayer(name, value);
  }

  function updateRowEvent(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    updateRow(name, value);
  }

  function updateTimelineEvent(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    updateTimeline(name, value);
  }

  function updateYAxisEvent(event: CustomEvent<{ prop: string; value: any }>) {
    const { detail } = event;
    const { prop, value } = detail;
    updateYAxis(prop, value);
  }
</script>

<Panel borderLeft>
  <svelte:fragment slot="header">
    <Chip>Timeline Configuration</Chip>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Details class="pb-3">
      <span slot="summary-left"> Timeline </span>
      <span slot="summary-right">
        {#if $selectedTimeline !== null}
          <button
            class="st-button icon"
            on:click|stopPropagation={() =>
              confirmDeleteTimelineModal.modal.show()}
            use:tooltip={{ content: 'Delete Timeline', placement: 'left' }}
          >
            <i class="bi bi-trash" />
          </button>
        {/if}
      </span>
      {#if $selectedTimeline !== null}
        <CssGrid columns="50% 50%">
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

          <fieldset>
            <label for="rows">Rows</label>
            {#if $selectedTimeline.rows.length}
              <select
                bind:value={$selectedRowId}
                class="st-select w-100"
                disabled={$selectedTimeline.rows.length === 1}
                name="rows"
              >
                {#each $selectedTimeline.rows as row}
                  <option value={row.id}>
                    {row.id}
                  </option>
                {/each}
              </select>
            {:else}
              <input class="st-input w-100" disabled value="Empty" />
            {/if}
          </fieldset>

          <fieldset>
            <label for="verticalGuides">Vertical Guides</label>
            {#if $selectedTimeline.verticalGuides.length}
              <select
                class="st-select w-100"
                disabled={$selectedTimeline.verticalGuides.length === 1}
                name="verticalGuides"
              >
                {#each $selectedTimeline.verticalGuides as verticalGuide}
                  <option value={verticalGuide.id}>
                    {verticalGuide.id}
                  </option>
                {/each}
              </select>
            {:else}
              <input class="st-input w-100" disabled value="Empty" />
            {/if}
          </fieldset>
        </CssGrid>
      {:else}
        <fieldset>No timeline selected</fieldset>
      {/if}
    </Details>

    <Details class="pb-3">
      <span slot="summary-left"> Row </span>
      <span slot="summary-right">
        {#if $selectedRow !== null}
          <button
            class="st-button icon"
            on:click|stopPropagation={() => confirmDeleteRowModal.modal.show()}
            use:tooltip={{ content: 'Delete Row', placement: 'left' }}
          >
            <i class="bi bi-trash" />
          </button>
        {/if}
      </span>
      {#if $selectedRow !== null}
        <CssGrid columns="50% 50%">
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

          <fieldset>
            <label for="horizontalGuides">Horizontal Guides</label>
            {#if $selectedRow.horizontalGuides.length}
              <select
                class="st-select w-100"
                disabled={$selectedRow.horizontalGuides.length === 1}
                name="horizontalGuides"
              >
                {#each $selectedRow.horizontalGuides as horizontalGuide}
                  <option value={horizontalGuide.id}>
                    {horizontalGuide.id}
                  </option>
                {/each}
              </select>
            {:else}
              <input class="st-input w-100" disabled value="Empty" />
            {/if}
          </fieldset>

          <fieldset>
            <label for="yAxes">Y-Axes</label>
            {#if $selectedRow.yAxes.length}
              <select
                bind:value={$selectedYAxisId}
                class="st-select w-100"
                disabled={$selectedRow.yAxes.length === 1}
                name="yAxes"
              >
                {#each $selectedRow.yAxes as yAxis}
                  <option value={yAxis.id}>
                    {yAxis.id}
                  </option>
                {/each}
              </select>
            {:else}
              <input class="st-input w-100" disabled value="Empty" />
            {/if}
          </fieldset>

          <fieldset>
            <label for="layers">Layers</label>
            {#if $selectedRow.layers.length}
              <select
                bind:value={$selectedLayerId}
                class="st-select w-100"
                disabled={$selectedRow.layers.length === 1}
                name="layers"
              >
                {#each $selectedRow.layers as layer}
                  <option value={layer.id}>
                    {layer.id}
                  </option>
                {/each}
              </select>
            {:else}
              <input class="st-input w-100" disabled value="Empty" />
            {/if}
          </fieldset>
        </CssGrid>
      {:else}
        <fieldset>No row selected</fieldset>
      {/if}
    </Details>

    <Details class="pb-3">
      <span slot="summary-left"> Y-Axis </span>
      <span slot="summary-right">
        <CssGrid
          gap="3px"
          columns="auto {$selectedYAxis !== null ? 'auto' : ''}"
        >
          <button
            class="st-button icon"
            on:click|stopPropagation={createYAxis}
            use:tooltip={{ content: 'Create Y-Axis', placement: 'left' }}
          >
            <i class="bi bi-plus fs-6" />
          </button>
          {#if $selectedYAxis !== null}
            <button
              class="st-button icon"
              on:click|stopPropagation={() =>
                confirmDeleteYAxisModal.modal.show()}
              use:tooltip={{ content: 'Delete Y-Axis', placement: 'left' }}
            >
              <i class="bi bi-trash" />
            </button>
          {/if}
        </CssGrid>
      </span>
      {#if $selectedYAxis !== null}
        <YAxisForm
          axes={$selectedRow.yAxes}
          axis={$selectedYAxis}
          on:update={updateYAxisEvent}
        />
      {:else}
        <fieldset>No y-axis selected</fieldset>
      {/if}
    </Details>

    <Details>
      <span slot="summary-left"> Layer </span>
      <span slot="summary-right">
        {#if $selectedLayer !== null}
          <button
            class="st-button icon"
            on:click|stopPropagation={() =>
              confirmDeleteLayerModal.modal.show()}
            use:tooltip={{ content: 'Delete Layer', placement: 'left' }}
          >
            <i class="bi bi-trash" />
          </button>
        {/if}
      </span>
      {#if $selectedLayer !== null}
        <fieldset>
          <label for="chartType">Chart Type</label>
          <select
            class="st-select w-100"
            name="chartType"
            value={$selectedLayer.chartType}
            on:change={updateLayerEvent}
          >
            <option value="activity"> Activity </option>
            <option value="line"> Line </option>
            <option value="x-range"> X-Range </option>
          </select>
        </fieldset>

        <LayerLineForm layer={$selectedLayer} on:input={updateLayerEvent} />

        <LayerXRangeForm
          layer={$selectedLayer}
          on:change={updateLayerEvent}
          on:input={updateLayerEvent}
        />
      {:else}
        <fieldset>No layer selected</fieldset>
      {/if}
    </Details>
  </svelte:fragment>
</Panel>

<ConfirmModal
  bind:this={confirmDeleteLayerModal}
  confirmText="Delete"
  message="Are you sure you want to delete this layer?"
  title="Delete Layer"
  on:confirm={deleteLayer}
/>

<ConfirmModal
  bind:this={confirmDeleteRowModal}
  confirmText="Delete"
  message="Are you sure you want to delete this row?"
  title="Delete Row"
  on:confirm={deleteRow}
/>

<ConfirmModal
  bind:this={confirmDeleteTimelineModal}
  confirmText="Delete"
  message="Are you sure you want to delete this timeline?"
  title="Delete Timeline"
  on:confirm={deleteTimeline}
/>

<ConfirmModal
  bind:this={confirmDeleteYAxisModal}
  confirmText="Delete"
  message="Are you sure you want to delete this y-axis?"
  title="Delete Y-Axis"
  on:confirm={deleteYAxis}
/>
