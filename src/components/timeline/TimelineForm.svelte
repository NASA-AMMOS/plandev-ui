<svelte:options immutable={true} />

<script lang="ts">
  import Field from '../form/Field.svelte';
  import ConfirmModal from '../modals/Confirm.svelte';
  import Panel from '../ui/Panel.svelte';
  import {
    selectedLayerId,
    selectedLayer,
    selectedRowId,
    selectedRow,
    selectedTimelineId,
    selectedTimeline,
    view,
  } from '../../stores/views';
  import Card from '../ui/Card.svelte';
  import FieldInputText from '../form/FieldInputText.svelte';
  import { required } from '../../utilities/validators';
  import Label from '../form/Label.svelte';
  import Select from '../form/Select.svelte';

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

  function updateRow(prop: string, value: any) {
    view.updateRow($selectedTimelineId, $selectedRowId, prop, value);
  }

  function updateTimeline(prop: string, value: any) {
    view.updateTimeline($selectedTimelineId, prop, value);
  }
</script>

<Panel hideHeader hideFooter>
  <span slot="body">
    <Field>
      <details open>
        <summary>Timeline</summary>
        {#if $selectedTimeline !== null}
          <FieldInputText
            name="timeline-margin-left"
            type="number"
            value={$selectedTimeline.marginLeft}
            validators={[required]}
            on:change={e => updateTimeline('marginLeft', e.detail)}
          >
            Margin Left
          </FieldInputText>

          <FieldInputText
            name="timeline-margin-right"
            type="number"
            value={$selectedTimeline.marginRight}
            validators={[required]}
            on:change={e => updateTimeline('marginRight', e.detail)}
          >
            Margin Right
          </FieldInputText>

          <Field>
            <Label for="rows">Rows</Label>
            <Select bind:value={$selectedRowId} name="rows">
              {#each $selectedTimeline.rows as row}
                <option value={row.id}>
                  {row.id}
                </option>
              {/each}
            </Select>
          </Field>

          <Field>
            <button
              class="button secondary w-100"
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
          <FieldInputText
            name="timeline-row-height"
            type="number"
            value={$selectedRow.height}
            validators={[required]}
            on:change={e => updateRow('height', e.detail)}
          >
            Height
          </FieldInputText>

          <Field>
            <Label for="layers">Layers</Label>
            <Select bind:value={$selectedLayerId} name="layers">
              {#each $selectedRow.layers as layer}
                <option value={layer.id}>
                  {layer.id}
                </option>
              {/each}
            </Select>
          </Field>

          <Field>
            <button
              class="button secondary w-100"
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
            <Label for="layer-type">Layer Type</Label>
            <Select name="layer-type" value={$selectedLayer.type}>
              <option value="activity"> Activity </option>
              <option value="resource"> Resource </option>
            </Select>
          </Field>

          <Field>
            <Label for="layer-type">Chart Type</Label>
            <Select name="layer-type" value={$selectedLayer.chartType}>
              <option value="activity"> Activity </option>
              <option value="line"> Line </option>
              <option value="x-range"> X-Range </option>
            </Select>
          </Field>

          <Field>
            <button
              class="button secondary w-100"
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
