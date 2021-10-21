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
    view,
  } from '../../../stores/views';
  import { getTargetValue } from '../../../utilities/generic';

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

  function onUpdateLayer(event: CustomEvent<{ e: Event; prop: string }>) {
    const { detail } = event;
    const { e, prop } = detail;
    updateLayer(e, prop);
  }

  function updateLayer(event: Event, prop: string) {
    const value = getTargetValue(event);
    view.updateLayer(
      $selectedTimelineId,
      $selectedRowId,
      $selectedLayerId,
      prop,
      value,
    );
  }

  function updateRow(event: Event, prop: string) {
    const value = getTargetValue(event);
    view.updateRow($selectedTimelineId, $selectedRowId, prop, value);
  }

  function updateTimeline(event: Event, prop: string) {
    const value = getTargetValue(event);
    view.updateTimeline($selectedTimelineId, prop, value);
  }
</script>

<Panel hideHeader hideFooter>
  <span slot="body">
    <Field>
      <details open>
        <summary>Timeline</summary>
        {#if $selectedTimeline !== null}
          <Grid columns="50% 50%">
            <Field>
              <Label for="margin-left">Margin Left</Label>
              <input
                class="st-input w-100"
                name="margin-left"
                type="number"
                value={$selectedTimeline.marginLeft}
                on:input={e => updateTimeline(e, 'marginLeft')}
              />
            </Field>

            <Field>
              <Label for="margin-right">Margin Right</Label>
              <input
                class="st-input w-100"
                name="margin-right"
                type="number"
                value={$selectedTimeline.marginRight}
                on:input={e => updateTimeline(e, 'marginRight')}
              />
            </Field>
          </Grid>

          <Field>
            <Label for="rows">Rows</Label>
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
          </Field>

          <Field>
            <button
              class="st-button secondary w-100"
              on:click|stopPropagation={() =>
                confirmDeleteTimelineModal.modal.show()}
            >
              Delete Timeline
            </button>
          </Field>
        {:else}
          <Card class="p-1">No timeline selected</Card>
        {/if}
      </details>
    </Field>

    <Field>
      <details open>
        <summary>Row</summary>
        {#if $selectedRow !== null}
          <Field>
            <Label for="row-height">Height</Label>
            <input
              class="st-input w-100"
              name="row-height"
              type="number"
              value={$selectedRow.height}
              on:input={e => updateRow(e, 'height')}
            />
          </Field>

          <Field>
            <Label for="layers">Layers</Label>
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
          </Field>

          <Field>
            <button
              class="st-button secondary w-100"
              on:click|stopPropagation={() =>
                confirmDeleteRowModal.modal.show()}
            >
              Delete Row
            </button>
          </Field>
        {:else}
          <Card class="p-1">No row selected</Card>
        {/if}
      </details>
    </Field>

    <Field>
      <details open>
        <summary>Layer</summary>
        {#if $selectedLayer !== null}
          <Field>
            <Label for="layer-type">Chart Type</Label>
            <select
              class="st-select w-100"
              name="layer-type"
              value={$selectedLayer.chartType}
              on:change={e => updateLayer(e, 'chartType')}
            >
              <option value="activity"> Activity </option>
              <option value="line"> Line </option>
              <option value="x-range"> X-Range </option>
            </select>
          </Field>

          <LayerLineForm
            layer={$selectedLayer}
            on:updateLayer={onUpdateLayer}
          />

          <LayerXRangeForm
            layer={$selectedLayer}
            on:updateLayer={onUpdateLayer}
          />

          <Field>
            <button
              class="st-button secondary w-100"
              on:click|stopPropagation={() =>
                confirmDeleteLayerModal.modal.show()}
            >
              Delete Layer
            </button>
          </Field>
        {:else}
          <Card class="p-1">No layer selected</Card>
        {/if}
      </details>
    </Field>
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
