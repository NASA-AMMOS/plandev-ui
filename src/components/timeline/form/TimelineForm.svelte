<svelte:options immutable={true} />

<script lang="ts">
  import LayerLineForm from './LayerLineForm.svelte';
  import LayerXRangeForm from './LayerXRangeForm.svelte';
  import Field from '../../form/Field.svelte';
  import Label from '../../form/Label.svelte';
  import ConfirmModal from '../../modals/Confirm.svelte';
  import Card from '../../ui/Card.svelte';
  import Grid from '../../ui/Grid.svelte';
  import Panel from '../../ui/Panel.svelte';
  import {
    selectedLayerId,
    selectedLayer,
    selectedRowId,
    selectedRow,
    selectedTimelineId,
    selectedTimeline,
    selectedYAxisId,
    selectedYAxis,
    view,
  } from '../../../stores/views';
  import { getTarget } from '../../../utilities/generic';
  import YAxisForm from './YAxisForm.svelte';
  import Details from '../../ui/Details.svelte';
  import { tooltip } from '../../../utilities/tooltip';

  let confirmDeleteLayerModal: ConfirmModal;
  let confirmDeleteRowModal: ConfirmModal;
  let confirmDeleteTimelineModal: ConfirmModal;

  function deleteLayer() {
    view.deleteLayer($selectedTimelineId, $selectedRowId, $selectedLayerId);
    $selectedLayerId = null;
  }

  function deleteRow() {
    view.deleteRow($selectedTimelineId, $selectedRowId);
    $selectedRowId = null;
  }

  function deleteTimeline() {
    view.deleteTimeline($selectedTimelineId);
    $selectedTimelineId = null;
  }

  function updateLayer(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    view.updateLayer(
      $selectedTimelineId,
      $selectedRowId,
      $selectedLayerId,
      name,
      value,
    );
  }

  function updateRow(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    view.updateRow($selectedTimelineId, $selectedRowId, name, value);
  }

  function updateTimeline(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    view.updateTimeline($selectedTimelineId, name, value);
  }

  function updateYAxis(event: CustomEvent<{ prop: string; value: any }>) {
    const { detail } = event;
    const { prop, value } = detail;
    view.updateYAxis(
      $selectedTimelineId,
      $selectedRowId,
      $selectedYAxisId,
      prop,
      value,
    );
    if (prop === 'id') {
      $selectedYAxisId = value as string;
    }
  }
</script>

<Panel hideHeader hideFooter>
  <span slot="body">
    <Details class="pb-3">
      <span slot="summary-left"> Timeline </span>
      <span slot="summary-right">
        {#if $selectedTimeline !== null}
          <button
            class="st-button-icon"
            on:click|stopPropagation={() =>
              confirmDeleteTimelineModal.modal.show()}
            use:tooltip={{ content: 'Delete Timeline', placement: 'left' }}
          >
            <i class="bi bi-trash" />
          </button>
        {/if}
      </span>
      {#if $selectedTimeline !== null}
        <Grid columns="33% 33% 33%">
          <Field>
            <Label for="marginLeft">Margin Left</Label>
            <input
              class="st-input w-100"
              name="marginLeft"
              type="number"
              value={$selectedTimeline.marginLeft}
              on:input={updateTimeline}
            />
          </Field>

          <Field>
            <Label for="marginRight">Margin Right</Label>
            <input
              class="st-input w-100"
              name="marginRight"
              type="number"
              value={$selectedTimeline.marginRight}
              on:input={updateTimeline}
            />
          </Field>

          <Field>
            <Label for="rows">Rows</Label>
            {#if $selectedTimeline.rows.length}
              <select
                bind:value={$selectedRowId}
                class="st-select w-100"
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
          </Field>
        </Grid>
      {:else}
        <Field>
          <Card class="p-1">No timeline selected</Card>
        </Field>
      {/if}
    </Details>

    <Details class="pb-3">
      <span slot="summary-left"> Row </span>
      <span slot="summary-right">
        {#if $selectedRow !== null}
          <button
            class="st-button-icon"
            on:click|stopPropagation={() => confirmDeleteRowModal.modal.show()}
            use:tooltip={{ content: 'Delete Row', placement: 'left' }}
          >
            <i class="bi bi-trash" />
          </button>
        {/if}
      </span>
      {#if $selectedRow !== null}
        <Grid columns="33% 33% 33%">
          <Field>
            <Label for="height">Height</Label>
            <input
              class="st-input w-100"
              name="height"
              type="number"
              value={$selectedRow.height}
              on:input={updateRow}
            />
          </Field>

          <Field>
            <Label for="yAxes">Y-Axes</Label>
            {#if $selectedRow.yAxes.length}
              <select
                bind:value={$selectedYAxisId}
                class="st-select w-100"
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
          </Field>

          <Field>
            <Label for="layers">Layers</Label>
            {#if $selectedRow.layers.length}
              <select
                bind:value={$selectedLayerId}
                class="st-select w-100"
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
          </Field>
        </Grid>
      {:else}
        <Field>
          <Card class="p-1">No row selected</Card>
        </Field>
      {/if}
    </Details>

    <Details class="pb-3">
      <span slot="summary-left"> Y-Axis </span>
      <span slot="summary-right" />
      {#if $selectedYAxis !== null}
        <YAxisForm axis={$selectedYAxis} on:update={updateYAxis} />
      {:else}
        <Field>
          <Card class="p-1">No y-axis selected</Card>
        </Field>
      {/if}
    </Details>

    <Details>
      <span slot="summary-left"> Layer </span>
      <span slot="summary-right">
        {#if $selectedLayer !== null}
          <button
            class="st-button-icon"
            on:click|stopPropagation={() =>
              confirmDeleteLayerModal.modal.show()}
            use:tooltip={{ content: 'Delete Layer', placement: 'left' }}
          >
            <i class="bi bi-trash" />
          </button>
        {/if}
      </span>
      {#if $selectedLayer !== null}
        <Field>
          <Label for="chartType">Chart Type</Label>
          <select
            class="st-select w-100"
            name="chartType"
            value={$selectedLayer.chartType}
            on:change={updateLayer}
          >
            <option value="activity"> Activity </option>
            <option value="line"> Line </option>
            <option value="x-range"> X-Range </option>
          </select>
        </Field>

        <LayerLineForm layer={$selectedLayer} on:input={updateLayer} />

        <LayerXRangeForm
          layer={$selectedLayer}
          on:change={updateLayer}
          on:input={updateLayer}
        />
      {:else}
        <Field>
          <Card class="p-1">No layer selected</Card>
        </Field>
      {/if}
    </Details>
  </span>
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
