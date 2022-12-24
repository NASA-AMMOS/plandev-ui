<svelte:options immutable={true} />

<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { maxTimeRange, viewTimeRange } from '../../../stores/plan';
  import { resourcesByViewLayerId, simulationDataset } from '../../../stores/simulation';
  import {
    selectedRow,
    selectedRowId,
    selectedTimeline,
    selectedTimelineId,
    view,
    viewSetSelectedRow,
    viewSetSelectedTimeline,
    viewUpdateRow,
    viewUpdateTimeline,
  } from '../../../stores/views';
  import type { Axis, HorizontalGuide, Row, VerticalGuide } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { showConfirmModal } from '../../../utilities/modal';
  import { getDoyTime } from '../../../utilities/time';
  import {
    createHorizontalGuide,
    createRow,
    createVerticalGuide,
    createYAxis,
    getYAxisBounds,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPicker from '../../form/ColorPicker.svelte';
  import Input from '../../form/Input.svelte';
  import GridMenu from '../../menus/GridMenu.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import Panel from '../../ui/Panel.svelte';

  export let gridId: number;

  let rows: Row[] = [];

  $: rows = $selectedTimeline?.rows || [];
  $: verticalGuides = $selectedTimeline?.verticalGuides || [];
  $: horizontalGuides = $selectedRow?.horizontalGuides || [];
  $: yAxes = $selectedRow?.yAxes || [];
  $: rowHasNonActivityChartLayer = !!$selectedRow?.layers.find(layer => layer.chartType !== 'activity') || false;
  $: simulationDataAvailable = $simulationDataset !== null;

  function updateRowEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateRow(name, value);
  }

  function updateTimelineEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateTimeline(name, value);
  }

  function updateYAxisScaleDomain(event: Event, yAxis: Axis) {
    const { name, value: v } = getTarget(event);
    const numberValue = v as number;
    const value = isNaN(numberValue) ? null : numberValue;
    let scaleDomain = [...yAxis.scaleDomain];

    if (name === 'domainMin') {
      scaleDomain[0] = value;
      scaleDomain[1] = scaleDomain[1] ?? null;
    } else if (name === 'domainMax') {
      scaleDomain[0] = scaleDomain[0] ?? null;
      scaleDomain[1] = value;
    }

    const [min, max] = scaleDomain;
    if (min === null && max === null) {
      scaleDomain = [];
    }

    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        axis.scaleDomain = scaleDomain;
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function handleAutoFitYAxisScaleDomain(yAxis: Axis) {
    const scaleDomain = getYAxisBounds(yAxis, $selectedRow.layers, $resourcesByViewLayerId);
    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        axis.scaleDomain = scaleDomain;
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisTickCount(event: Event, yAxis: Axis) {
    const { value: v } = getTarget(event);
    const numberValue = v as number;
    const value = isNaN(numberValue) ? null : numberValue;

    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        axis.tickCount = value;
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function handleNewYAxisClick() {
    const yAxis = createYAxis(yAxes);
    yAxes = [...yAxes, yAxis];
    viewUpdateRow('yAxes', yAxes);
  }

  function handleDeleteYAxisClick(yAxis: Axis) {
    const filteredYAxes = yAxes.filter(axis => axis.id !== yAxis.id);
    viewUpdateRow('yAxes', filteredYAxes);
  }

  function addTimelineRow() {
    if (!$selectedTimeline) {
      return;
    }

    const row = createRow($selectedTimeline.rows);
    rows = [...rows, row];
    viewUpdateTimeline('rows', rows);
  }

  function deleteTimelineRow(row: Row) {
    const filteredRows = rows.filter(r => r.id !== row.id);
    viewUpdateTimeline('rows', filteredRows);
  }

  async function handleDeleteRowClick(row: Row) {
    const { confirm } = await showConfirmModal(
      'Delete',
      'Are you sure you want to delete this timeline row?',
      'Delete Row',
      true,
    );
    if (confirm) {
      deleteTimelineRow(row);
    }
  }

  function handleDndConsiderRows(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    rows = detail.items as Row[];
  }

  function handleDndFinalizeRows(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    rows = detail.items as Row[];
    viewUpdateTimeline('rows', rows, $selectedTimelineId);
  }

  function handleDeleteVerticalGuideClick(verticalGuide: VerticalGuide) {
    const filteredVerticalGuides = verticalGuides.filter(guide => guide.id !== verticalGuide.id);
    viewUpdateTimeline('verticalGuides', filteredVerticalGuides, $selectedTimelineId);
  }

  function handleDeleteHorizontalGuideClick(horizontalGuide: HorizontalGuide) {
    const filteredHorizontalGuides = horizontalGuides.filter(guide => guide.id !== horizontalGuide.id);
    viewUpdateRow('horizontalGuides', filteredHorizontalGuides);
  }

  function updateVerticalGuideTimestamp(event: CustomEvent, verticalGuide: VerticalGuide) {
    const value = event.detail.value;
    const newVerticalGuides = verticalGuides.map(guide => {
      if (guide.id === verticalGuide.id) {
        guide.timestamp = value as string;
      }
      return guide;
    });
    viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
  }

  function handleUpdateVerticalGuideLabel(event: Event, verticalGuide: VerticalGuide) {
    const { name, value } = getTarget(event);
    const newVerticalGuides = verticalGuides.map(guide => {
      if (guide.id === verticalGuide.id) {
        guide.label[name] = value;
      }
      return guide;
    });
    viewUpdateRow('verticalGuides', newVerticalGuides);
  }

  function handleUpdateHorizontalGuideLabel(event: Event, horizontalGuide: HorizontalGuide) {
    const { name, value } = getTarget(event);
    const newHorizontalGuides = horizontalGuides.map(guide => {
      if (guide.id === horizontalGuide.id) {
        guide.label[name] = value;
      }
      return guide;
    });
    viewUpdateRow('horizontalGuides', newHorizontalGuides);
  }

  function handleUpdateHorizontalGuideNumberValue(event: Event, horizontalGuide: HorizontalGuide) {
    const { name, value } = getTarget(event);
    if (isNaN(value as number)) {
      return;
    }
    const newHorizontalGuides = horizontalGuides.map(guide => {
      if (guide.id === horizontalGuide.id) {
        guide[name] = value;
      }
      return guide;
    });
    viewUpdateRow('horizontalGuides', newHorizontalGuides);
  }

  function handleNewHorizontalGuideClick() {
    if (!$selectedRow) {
      return;
    }

    const newHorizontalGuide = createHorizontalGuide(yAxes, horizontalGuides);
    viewUpdateRow('horizontalGuides', [...horizontalGuides, newHorizontalGuide]);
  }

  function handleNewVerticalGuideClick() {
    if (typeof $selectedTimelineId !== 'number' || !$viewTimeRange) {
      return;
    }

    // Place the cursor in the middle of the timeline
    const centerTime = $viewTimeRange.start + ($viewTimeRange.end - $viewTimeRange.start) / 2;
    const centerDateDoy = getDoyTime(new Date(centerTime));

    const newVerticalGuide = createVerticalGuide(centerDateDoy, verticalGuides);
    viewUpdateTimeline('verticalGuides', [...verticalGuides, newVerticalGuide], $selectedTimelineId);
  }

  // This is the JS way to style the dragged element, notice it is being passed into the dnd-zone
  function transformDraggedElement(draggedEl: Element) {
    const el = draggedEl.querySelector('.timeline-row') as HTMLElement;
    el.style.background = 'var(--st-gray-10)';
    el.classList.add('timeline-row-dragging');
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

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Timeline Editor" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if !$selectedRow}
      <!-- Select Timeline. -->
      <div class="timeline-select-container">
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
      </div>

      <!-- Timeline editing -->
      {#if !$selectedTimeline}
        <fieldset class="editor-section">No timeline selected</fieldset>
      {:else}
        <fieldset class="editor-section">
          <div class="st-typography-medium editor-section-header">Margins</div>
          <CssGrid columns="1fr 1fr" gap="8px">
            <Input>
              <label for="marginLeft">Margin Left</label>
              <input
                min={0}
                class="st-input w-100"
                name="marginLeft"
                type="number"
                value={$selectedTimeline.marginLeft}
                on:input|stopPropagation={updateTimelineEvent}
              />
            </Input>

            <Input>
              <label for="marginRight">Margin Right</label>
              <input
                min={0}
                class="st-input w-100"
                name="marginRight"
                type="number"
                value={$selectedTimeline.marginRight}
                on:input|stopPropagation={updateTimelineEvent}
              />
            </Input>
          </CssGrid>
        </fieldset>

        <fieldset class="editor-section">
          <div class="editor-section-header editor-section-header-with-button">
            <div class="st-typography-medium">Vertical Guides</div>
            <button
              on:click={handleNewVerticalGuideClick}
              use:tooltip={{ content: 'New Vertical Guide', placement: 'top' }}
              class="st-button icon"
            >
              <PlusIcon />
            </button>
          </div>
          {#if verticalGuides.length}
            <div class="guides">
              {#each verticalGuides as verticalGuide (verticalGuide.id)}
                <div class="guide">
                  <input
                    value={verticalGuide.label.text}
                    on:input={event => {
                      const { value } = getTarget(event);
                      const newVerticalGuides = verticalGuides.map(guide => {
                        if (guide.id === verticalGuide.id) {
                          guide.label.text = value.toString();
                        }
                        return guide;
                      });
                      viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
                    }}
                    autocomplete="off"
                    class="st-input w-100"
                    name="label"
                    placeholder="Label"
                  />
                  <DatePicker
                    name="timestamp"
                    minDate={new Date($maxTimeRange.start)}
                    maxDate={new Date($maxTimeRange.end)}
                    dateString={verticalGuide.timestamp}
                    on:change={event => updateVerticalGuideTimestamp(event, verticalGuide)}
                    on:keydown={event => updateVerticalGuideTimestamp(event, verticalGuide)}
                  />
                  <ColorPicker
                    value={verticalGuide.label.color}
                    on:input={event => handleUpdateVerticalGuideLabel(event, verticalGuide)}
                    name="color"
                  />
                  <button
                    on:click={() => handleDeleteVerticalGuideClick(verticalGuide)}
                    use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                    class="st-button icon"
                  >
                    <TrashIcon />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </fieldset>

        <fieldset class="editor-section editor-section-rows">
          <div class="editor-section-header editor-section-header-with-button">
            <div class="st-typography-medium">Rows</div>
            <button
              on:click={addTimelineRow}
              use:tooltip={{ content: 'New Row', placement: 'top' }}
              class="st-button icon"
            >
              <PlusIcon />
            </button>
          </div>
          <div
            class="timeline-rows"
            on:consider={handleDndConsiderRows}
            on:finalize={handleDndFinalizeRows}
            use:dndzone={{
              items: rows,
              transformDraggedElement,
              type: 'rows',
            }}
          >
            {#each rows as row (row.id)}
              <div>
                <div class="st-typography-body timeline-row">
                  <span class="drag-icon">
                    <GripVerticalIcon />
                  </span>
                  {row.name}
                  <div>
                    <button
                      use:tooltip={{ content: 'Edit Row', placement: 'top' }}
                      class="st-button icon"
                      on:click={() => {
                        viewSetSelectedRow(row.id);
                      }}
                    >
                      <PenIcon />
                    </button>
                    <button
                      use:tooltip={{ content: 'Delete Row', placement: 'top' }}
                      class="st-button icon"
                      on:click|stopPropagation={() => handleDeleteRowClick(row)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </fieldset>
      {/if}
    {:else}
      <!-- Row editing -->
      <button
        on:click={() => {
          viewSetSelectedRow(null);
        }}
        class="st-button tertiary section-back-button"
      >
        <ArrowLeftIcon />
        Back to Timeline {$selectedTimelineId}
      </button>
      <div class="timeline-select-container">
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
          {#each rows as row (row.id)}
            <option value={row.id}>
              {row.name}
            </option>
          {/each}
        </select>
      </div>
      <fieldset class="editor-section">
        <div class="st-typography-medium editor-section-header">Details</div>
        <div style="display: grid">
          <Input>
            <label for="name">Row Name</label>
            <input
              class="st-input w-100"
              name="name"
              autocomplete="off"
              type="string"
              value={$selectedRow.name}
              on:input|stopPropagation={updateRowEvent}
            />
          </Input>
        </div>
        <CssGrid columns="1fr 1fr" gap="8px">
          <Input>
            <label for="marginLeft">Row Height</label>
            <input
              disabled={$selectedRow.autoAdjustHeight}
              class="st-input w-100"
              name="height"
              type="number"
              value={$selectedRow.height}
              on:input|stopPropagation={updateRowEvent}
            />
          </Input>
          <Input class="row-height-select-wrapper">
            <select
              class="st-select w-100"
              data-type="bool"
              name="autoAdjustHeight"
              value={$selectedRow.autoAdjustHeight}
              on:change={e => {
                const { value } = getTarget(e);
                viewUpdateRow('autoAdjustHeight', value === 'true');
              }}
            >
              <option value={false}>Manual</option>
              <option value={true}>Auto</option>
            </select>
          </Input>
        </CssGrid>
      </fieldset>

      {#if rowHasNonActivityChartLayer}
        <fieldset class="editor-section">
          <div class="editor-section-header editor-section-header-with-button">
            <div class="st-typography-medium">Horizontal Guides</div>
            <button
              on:click={handleNewHorizontalGuideClick}
              use:tooltip={{ content: 'New Horizontal Guide', placement: 'top' }}
              class="st-button icon"
            >
              <PlusIcon />
            </button>
          </div>
          {#if horizontalGuides.length}
            <div class="guides">
              {#each horizontalGuides as horizontalGuide (horizontalGuide.id)}
                <div class="guide">
                  <input
                    value={horizontalGuide.label.text}
                    on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                    autocomplete="off"
                    class="st-input w-100"
                    name="text"
                    placeholder="Label"
                  />
                  <input
                    value={horizontalGuide.y}
                    on:input={event => handleUpdateHorizontalGuideNumberValue(event, horizontalGuide)}
                    autocomplete="off"
                    class="st-input w-100"
                    name="y"
                    placeholder="Y value"
                    type="number"
                  />
                  <ColorPicker
                    value={horizontalGuide.label.color}
                    on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                    name="color"
                  />
                  <select
                    on:input={event => handleUpdateHorizontalGuideNumberValue(event, horizontalGuide)}
                    class="st-select w-100"
                    data-type="number"
                    name="yAxisId"
                    value={horizontalGuide.yAxisId}
                  >
                    {#each yAxes as axis}
                      <option value={axis.id}>
                        {axis.label.text}
                      </option>
                    {/each}
                  </select>
                  <button
                    on:click={() => handleDeleteHorizontalGuideClick(horizontalGuide)}
                    use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                    class="st-button icon"
                  >
                    <TrashIcon />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </fieldset>

        <fieldset class="editor-section">
          <div class="editor-section-header editor-section-header-with-button">
            <div class="st-typography-medium">Y Axes</div>
            <button
              on:click={handleNewYAxisClick}
              use:tooltip={{ content: 'New Y Axis', placement: 'top' }}
              class="st-button icon"
            >
              <PlusIcon />
            </button>
          </div>
          {#if yAxes.length}
            {#each yAxes as yAxis (yAxis.id)}
              <div class="yAxisLabel">
                <div class="w-100">
                  <input
                    autocomplete="off"
                    placeholder="Label"
                    class="st-input w-100"
                    name="label"
                    type="string"
                    value={yAxis.label.text}
                    on:input={event => {
                      const { value } = getTarget(event);
                      const newRowYAxes = yAxes.map(axis => {
                        if (axis.id === yAxis.id) {
                          axis.label.text = value.toString();
                        }
                        return axis;
                      });
                      viewUpdateRow('yAxes', newRowYAxes);
                    }}
                  />
                </div>
                <div
                  use:tooltip={{
                    content: simulationDataAvailable
                      ? 'Fit axis bounds to domain of axis resources'
                      : 'Axis bounds auto fit only available after simulation',
                    placement: 'top',
                  }}
                >
                  <button
                    disabled={!simulationDataAvailable}
                    class="st-button secondary"
                    on:click={() => handleAutoFitYAxisScaleDomain(yAxis)}>Fit</button
                  >
                </div>
                <Input>
                  <label for="domainMin">Min</label>
                  <input
                    class="st-input w-100"
                    name="domainMin"
                    type="number"
                    value={yAxis.scaleDomain[0]}
                    on:input={event => updateYAxisScaleDomain(event, yAxis)}
                  />
                </Input>
                <Input>
                  <label for="domainMax">Max</label>
                  <input
                    class="st-input w-100"
                    name="domainMax"
                    type="number"
                    value={yAxis.scaleDomain[1]}
                    on:input={event => updateYAxisScaleDomain(event, yAxis)}
                  />
                </Input>
                <Input>
                  <label for="tickCount">Ticks</label>
                  <input
                    class="st-input w-100"
                    name="tickCount"
                    type="number"
                    value={yAxis.tickCount}
                    on:input={event => updateYAxisTickCount(event, yAxis)}
                  />
                </Input>
                <button
                  on:click={() => handleDeleteYAxisClick(yAxis)}
                  use:tooltip={{ content: 'Delete Y Axis', placement: 'top' }}
                  class="st-button icon"
                >
                  <TrashIcon />
                </button>
              </div>
            {/each}
          {/if}
        </fieldset>
      {/if}
    {/if}
  </svelte:fragment>
</Panel>

<style>
  .timeline-select-container {
    border-bottom: 1px solid var(--st-gray-20);
    padding: 16px 8px;
  }

  .editor-section {
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .editor-section-header {
    user-select: none;
  }

  .editor-section-header .st-button.icon,
  .timeline-row .st-button.icon,
  .guide .st-button.icon,
  .yAxisLabel .st-button.icon {
    color: var(--st-gray-50);
  }

  .editor-section-header-with-button {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .editor-section-rows {
    padding: 0;
  }

  .editor-section-rows .editor-section-header {
    padding: 16px 16px 0;
  }

  .timeline-rows {
    min-height: 100px;
    outline: none !important;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 16px;
  }

  .timeline-row {
    align-items: center;
    display: flex;
    height: 40px;
    justify-content: space-between;
    padding: 0px 16px;
  }

  .drag-icon {
    color: var(--st-gray-50);
    display: none;
    margin-left: -15px;
    margin-top: 0px;
    position: absolute;
  }

  .timeline-row:hover,
  .timeline-row:active {
    background: var(--st-gray-10);
  }

  .timeline-row:hover .drag-icon,
  :global(.timeline-row-dragging) .drag-icon {
    display: flex;
  }

  .guides {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .guide,
  .yAxisLabel {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .guide :global(.date-picker) {
    flex: 1;
    min-width: 168px;
  }

  .yAxisLabel :global(.input-stacked) {
    min-width: 80px;
    width: auto;
  }

  .section-back-button {
    border-radius: 0;
    gap: 8px;
    height: 32px;
    justify-content: flex-start;
  }

  :global(.input.input-stacked.row-height-select-wrapper) {
    align-items: flex-end;
    display: flex;
  }

  :global(.input.input-stacked.row-height-select-wrapper) {
    align-items: flex-end;
    display: flex;
  }
</style>
