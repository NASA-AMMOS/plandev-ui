<svelte:options immutable={true} />

<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import DuplicateIcon from '@nasa-jpl/stellar/icons/duplicate.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { ViewConstants } from '../../../enums/view';
  import { activityTypes, maxTimeRange, viewTimeRange } from '../../../stores/plan';
  import {
    externalResourceNames,
    resourceTypes,
    resourcesByViewLayerId,
    simulationDataset,
  } from '../../../stores/simulation';
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
  import type {
    ActivityLayer,
    Axis,
    HorizontalGuide,
    Layer,
    LineLayer,
    Row,
    Timeline,
    VerticalGuide,
    XRangeLayer,
  } from '../../../types/timeline';
  import type { ViewGridSection } from '../../../types/view';
  import effects from '../../../utilities/effects';
  import { getTarget } from '../../../utilities/generic';
  import { getDoyTime } from '../../../utilities/time';
  import {
    createHorizontalGuide,
    createRow,
    createTimelineActivityLayer,
    createTimelineLineLayer,
    createTimelineXRangeLayer,
    createVerticalGuide,
    createYAxis,
    getYAxesWithScaleDomains,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPicker from '../../form/ColorPicker.svelte';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import ColorSchemePicker from '../../form/ColorSchemePicker.svelte';
  import Input from '../../form/Input.svelte';
  import GridMenu from '../../menus/GridMenu.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import Panel from '../../ui/Panel.svelte';
  import TimelineEditorLayerFilter from './TimelineEditorLayerFilter.svelte';
  import TimelineEditorLayerSelectedFilters from './TimelineEditorLayerSelectedFilters.svelte';
  import TimelineEditorLayerSettings from './TimelineEditorLayerSettings.svelte';
  import TimelineEditorYAxisSettings from './TimelineEditorYAxisSettings.svelte';

  export let gridSection: ViewGridSection;

  let horizontalGuides: HorizontalGuide[] = [];
  let rows: Row[] = [];
  let timelines: Timeline[] = [];
  let verticalGuides: VerticalGuide[] = [];

  $: rows = $selectedTimeline?.rows || [];
  $: timelines = $view?.definition.plan.timelines || [];
  $: verticalGuides = $selectedTimeline?.verticalGuides || [];
  $: horizontalGuides = $selectedRow?.horizontalGuides || [];
  $: yAxes = $selectedRow?.yAxes || [];
  $: layers = $selectedRow?.layers || [];
  $: rowHasNonActivityChartLayer = !!$selectedRow?.layers.find(layer => layer.chartType !== 'activity') || false;
  $: simulationDataAvailable = $simulationDataset !== null;

  function updateRowEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateRow(name, value);
  }

  function updateRowMinHeight(event: Event) {
    const { name, value } = getTarget(event);
    if (typeof value === 'number' && !isNaN(value)) {
      if (value >= ViewConstants.MIN_ROW_HEIGHT) {
        viewUpdateRow(name, value);
      }
    }
  }

  function updateTimelineEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateTimeline(name, value);
  }

  function updateTimelineMarginLeft(event: Event) {
    const { name, value } = getTarget(event);
    if (typeof value === 'number' && !isNaN(value)) {
      if (value >= ViewConstants.MIN_MARGIN_LEFT) {
        viewUpdateRow(name, value);
        viewUpdateTimeline(name, value);
      }
    }
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
    const yAxis = createYAxis(timelines);
    yAxes = [...yAxes, yAxis];
    viewUpdateRow('yAxes', yAxes);
  }

  function handleDeleteYAxisClick(yAxis: Axis) {
    const filteredYAxes = yAxes.filter(axis => axis.id !== yAxis.id);
    viewUpdateRow('yAxes', filteredYAxes);
  }

  function handleNewLayerClick() {
    const layer = createTimelineActivityLayer(timelines);
    layers = [...layers, layer];
    viewUpdateRow('layers', layers);
  }

  function handleDeleteLayerClick(layer: Layer) {
    const filteredLayers = layers.filter(l => l.id !== layer.id);
    viewUpdateRow('layers', filteredLayers);
  }

  function handleDeleteLayerFilterValue(layer: Layer, value: string) {
    const newValues = getFilterValuesForLayer(layer).filter(i => value !== i);
    handleUpdateLayerFilter(newValues, layer);
  }

  function addTimelineRow() {
    if (!$selectedTimeline) {
      return;
    }

    const row = createRow(timelines);
    rows = [...rows, row];
    viewUpdateTimeline('rows', rows);
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

  function handleDndConsiderLayers(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    layers = detail.items as Layer[];
  }

  function handleDndFinalizeLayers(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    layers = detail.items as Layer[];
    viewUpdateRow('layers', layers);
  }

  function handleDndConsiderYAxes(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    yAxes = detail.items as Axis[];
  }

  function handleDndFinalizeYAxes(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    yAxes = detail.items as Axis[];
    viewUpdateRow('yAxes', yAxes);
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
        return {
          ...guide,
          label: {
            ...guide.label,
            [name]: value,
          },
        };
      }
      return guide;
    });
    viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
  }

  function handleUpdateHorizontalGuideLabel(event: Event, horizontalGuide: HorizontalGuide) {
    const { name, value } = getTarget(event);
    const newHorizontalGuides = horizontalGuides.map(guide => {
      if (guide.id === horizontalGuide.id) {
        return {
          ...guide,
          label: {
            ...guide.label,
            [name]: value,
          },
        };
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
        return {
          ...guide,
          [name]: value,
        };
      }
      return guide;
    });
    viewUpdateRow('horizontalGuides', newHorizontalGuides);
  }

  function handleUpdateLayerFilter(values: string[], layer: Layer) {
    const newLayers = layers.map(currentLayer => {
      if (layer.id === currentLayer.id) {
        if (currentLayer.chartType === 'activity') {
          const newLayer: Layer = {
            ...currentLayer,
            filter: {
              ...currentLayer.filter,
              activity: {
                types: values,
              },
            },
          };
          return newLayer;
        } else if (currentLayer.chartType === 'line' || currentLayer.chartType === 'x-range') {
          const newLayer: Layer = {
            ...currentLayer,
            filter: {
              ...currentLayer.filter,
              resource: {
                names: values,
              },
            },
          };
          return newLayer;
        }
      }
      return currentLayer;
    });

    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateLayerProperty(event: CustomEvent, layer: Layer) {
    const { name, value } = event.detail;
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        return {
          ...layer,
          [name]: value,
        };
      }
      return l;
    });
    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateLayerChartType(event: Event, layer: Layer) {
    const { value } = getTarget(event);

    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        let newLayer: ActivityLayer | LineLayer | XRangeLayer | undefined;
        if (value === 'activity') {
          newLayer = { ...createTimelineActivityLayer(timelines), id: l.id };
        } else if (value === 'line' || value === 'x-range') {
          if (value === 'line') {
            newLayer = { ...createTimelineLineLayer(timelines, yAxes), id: l.id };
          } else {
            newLayer = { ...createTimelineXRangeLayer(timelines, yAxes), id: l.id };
          }

          // Assign yAxisId to existing value or new axis
          if (typeof layer.yAxisId === 'number') {
            newLayer.yAxisId = l.yAxisId;
          } else if (yAxes.length > 0) {
            newLayer.yAxisId = yAxes[0].id;
          } else {
            handleNewYAxisClick();
            newLayer.yAxisId = yAxes[0].id;
          }
        }
        if (newLayer !== undefined) {
          return newLayer;
        }
      }
      return l;
    });

    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateLayerColor(event: CustomEvent, layer: Layer) {
    const { value } = event.detail;
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        if (l.chartType === 'activity') {
          (l as ActivityLayer).activityColor = value as string;
        } else if (l.chartType === 'line') {
          (l as LineLayer).lineColor = value as string;
        }
      }
      return l;
    });
    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateLayerColorScheme(event: CustomEvent, layer: Layer) {
    const { value } = event.detail;
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        (l as XRangeLayer).colorScheme = value;
      }
      return l;
    });
    viewUpdateRow('layers', newLayers);
  }

  function handleNewHorizontalGuideClick() {
    if (!$selectedRow) {
      return;
    }
    const yAxesWithScaleDomains = getYAxesWithScaleDomains(yAxes, layers, $resourcesByViewLayerId, $viewTimeRange);
    const newHorizontalGuide = createHorizontalGuide(timelines, yAxesWithScaleDomains);
    viewUpdateRow('horizontalGuides', [...horizontalGuides, newHorizontalGuide]);
  }

  function handleNewVerticalGuideClick() {
    if (typeof $selectedTimelineId !== 'number' || !$viewTimeRange) {
      return;
    }

    // Place the cursor in the middle of the timeline
    const centerTime = $viewTimeRange.start + ($viewTimeRange.end - $viewTimeRange.start) / 2;
    const centerDateDoy = getDoyTime(new Date(centerTime));

    const newVerticalGuide = createVerticalGuide(timelines, centerDateDoy);
    viewUpdateTimeline('verticalGuides', [...verticalGuides, newVerticalGuide], $selectedTimelineId);
  }

  // This is the JS way to style the dragged element, notice it is being passed into the dnd-zone
  function transformDraggedElement(draggedEl?: Element) {
    const el = draggedEl?.querySelector('.timeline-element') as HTMLElement;
    if (!el) {
      return;
    }
    el.style.background = 'var(--st-gray-10)';
    el.classList.add('timeline-element-dragging');
  }

  function getColorForLayer(layer: Layer) {
    if (layer.chartType === 'activity') {
      return (layer as ActivityLayer).activityColor;
    } else if (layer.chartType === 'line') {
      return (layer as LineLayer).lineColor;
    } else if (layer.chartType === 'x-range') {
      return (layer as XRangeLayer).colorScheme;
    }
  }

  function getFilterValuesForLayer(layer: Layer) {
    if (layer.chartType === 'activity') {
      const activityLayer = layer as ActivityLayer;
      const activityTypes = activityLayer.filter?.activity?.types ?? [];
      return [...activityTypes];
    } else if (layer.chartType === 'line' || layer.chartType === 'x-range') {
      const resourceLayer = layer as LineLayer | XRangeLayer;
      const resourceNames = resourceLayer.filter?.resource?.names ?? [];
      return [...resourceNames];
    }
    return [];
  }

  function getFilterOptionsForLayer(layer: Layer) {
    if (layer.chartType === 'activity') {
      return $activityTypes.map(t => t.name);
    } else if (layer.chartType === 'line' || layer.chartType === 'x-range') {
      return $resourceTypes
        .map(t => t.name)
        .concat($externalResourceNames)
        .sort();
    }
    return [];
  }

  onMount(() => {
    if ($selectedTimelineId === null) {
      const firstTimeline = $view?.definition.plan.timelines[0];
      if (firstTimeline) {
        viewSetSelectedTimeline(firstTimeline.id);
      }
    }
  });
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Timeline Editor" />
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
          {#each $view?.definition.plan.timelines ?? [] as timeline}
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
          <CssGrid columns="1fr 1fr" gap="8px" class="editor-section-grid">
            <form on:submit={event => event.preventDefault()}>
              <Input>
                <label for="marginLeft">Margin Left</label>
                <input
                  min={ViewConstants.MIN_MARGIN_LEFT}
                  class="st-input w-100"
                  name="marginLeft"
                  type="number"
                  value={$selectedTimeline.marginLeft}
                  on:input|stopPropagation={updateTimelineMarginLeft}
                />
              </Input>
            </form>
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
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 168px 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
                <div>Date</div>
              </CssGrid>
              <div class="guides timeline-elements">
                {#each verticalGuides as verticalGuide (verticalGuide.id)}
                  <div class="guide timeline-element">
                    <CssGrid columns="1fr 168px 24px 24px" gap="8px" class="editor-section-grid">
                      <Input layout="stacked" class="editor-input">
                        <label for="text">Label</label>
                        <input
                          value={verticalGuide.label.text}
                          on:input={event => {
                            const { value } = getTarget(event);
                            const newVerticalGuides = verticalGuides.map(guide => {
                              if (guide.id === verticalGuide.id) {
                                guide.label.text = value?.toString() ?? '';
                              }
                              return guide;
                            });
                            viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
                          }}
                          autocomplete="off"
                          class="st-input w-100"
                          name="text"
                          placeholder="Label"
                        />
                      </Input>
                      <Input layout="stacked" class="editor-input">
                        <label for="timestamp">Time</label>
                        <DatePicker
                          name="timestamp"
                          minDate={new Date($maxTimeRange.start)}
                          maxDate={new Date($maxTimeRange.end)}
                          dateString={verticalGuide.timestamp}
                          on:change={event => updateVerticalGuideTimestamp(event, verticalGuide)}
                          on:keydown={event => updateVerticalGuideTimestamp(event, verticalGuide)}
                        />
                      </Input>
                      <div use:tooltip={{ content: 'Guide Color', placement: 'top' }}>
                        <ColorPicker
                          value={verticalGuide.label.color}
                          on:input={event => handleUpdateVerticalGuideLabel(event, verticalGuide)}
                          name="color"
                        />
                      </div>
                      <button
                        on:click={() => handleDeleteVerticalGuideClick(verticalGuide)}
                        use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                        class="st-button icon"
                      >
                        <TrashIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </fieldset>

        <fieldset class="editor-section editor-section-draggable">
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
          {#if rows.length}
            <div
              class="timeline-rows timeline-elements"
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
                  <div class="st-typography-body timeline-row timeline-element">
                    <span class="drag-icon">
                      <GripVerticalIcon />
                    </span>
                    <span class="timeline-row-name">
                      {row.name}
                    </span>
                    <div class="timeline-row-buttons">
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
                        use:tooltip={{ content: 'Duplicate Row', placement: 'top' }}
                        class="st-button icon"
                        on:click={() => {
                          if ($selectedTimeline) {
                            effects.duplicateTimelineRow(row, $selectedTimeline, timelines);
                          }
                        }}
                      >
                        <DuplicateIcon />
                      </button>
                      <button
                        use:tooltip={{ content: 'Delete Row', placement: 'top' }}
                        class="st-button icon"
                        on:click|stopPropagation={() => {
                          effects.deleteTimelineRow(row, rows, $selectedTimelineId);
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div />
          {/if}
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
        <CssGrid columns="1fr 1fr" gap="8px" class="editor-section-grid">
          <form on:submit={event => event.preventDefault()}>
            <Input>
              <label for="marginLeft">Row Height</label>
              <input
                min={ViewConstants.MIN_ROW_HEIGHT}
                disabled={$selectedRow.autoAdjustHeight}
                class="st-input w-100"
                name="height"
                type="number"
                value={$selectedRow.height}
                on:input|stopPropagation={updateRowMinHeight}
              />
            </Input>
          </form>
          <Input>
            <label for="marginLeft">Resize Mode</label>
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
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 1fr 1fr 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
                <div>Y Value</div>
                <div>Y Axis</div>
              </CssGrid>
              <div class="guides timeline-elements">
                {#each horizontalGuides as horizontalGuide (horizontalGuide.id)}
                  <div class="guide timeline-element">
                    <CssGrid columns="1fr 1fr 1fr 24px 24px" gap="8px" class="editor-section-grid">
                      <Input layout="stacked" class="editor-input">
                        <label for="text">Label</label>
                        <input
                          value={horizontalGuide.label.text}
                          on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                          autocomplete="off"
                          class="st-input w-100"
                          name="text"
                        />
                      </Input>
                      <Input layout="stacked" class="editor-input">
                        <label for="y">Y Value</label>
                        <input
                          value={horizontalGuide.y}
                          on:input={event => handleUpdateHorizontalGuideNumberValue(event, horizontalGuide)}
                          autocomplete="off"
                          class="st-input w-100"
                          name="y"
                          type="number"
                        />
                      </Input>
                      <Input layout="stacked" class="editor-input">
                        <label for="yAxisId">Y Axis</label>
                        <select
                          on:input={event => handleUpdateHorizontalGuideNumberValue(event, horizontalGuide)}
                          class="st-select w-100"
                          data-type="number"
                          name="yAxisId"
                        >
                          {#each yAxes as axis}
                            <option value={axis.id} selected={horizontalGuide.yAxisId === axis.id}>
                              {axis.label.text}
                            </option>
                          {/each}
                        </select>
                      </Input>
                      <div use:tooltip={{ content: 'Guide Color', placement: 'top' }}>
                        <ColorPicker
                          value={horizontalGuide.label.color}
                          on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                          name="color"
                        />
                      </div>
                      <button
                        on:click={() => handleDeleteHorizontalGuideClick(horizontalGuide)}
                        use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                        class="st-button icon"
                      >
                        <TrashIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </fieldset>
      {/if}
      <!-- TODO perhaps separate out each section into a mini editor? -->
      {#if yAxes.length > 0 || rowHasNonActivityChartLayer}
        <fieldset class="editor-section editor-section-draggable">
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
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 56px 24px 24px" gap="8px" class="editor-section-grid-labels" padding="0px 16px">
                <div>Name</div>
                <div>Ticks</div>
              </CssGrid>
              <div
                class="timeline-rows timeline-elements"
                on:consider={handleDndConsiderYAxes}
                on:finalize={handleDndFinalizeYAxes}
                use:dndzone={{
                  items: yAxes,
                  transformDraggedElement,
                  type: 'rows',
                }}
              >
                {#each yAxes as yAxis (yAxis.id)}
                  <div class="timeline-y-axis timeline-element">
                    <CssGrid columns="1fr 56px 24px 24px" gap="8px" class="editor-section-grid">
                      <span class="drag-icon">
                        <GripVerticalIcon />
                      </span>
                      <div class="w-100">
                        <Input layout="stacked" class="editor-input">
                          <label for="text">Y Axis</label>
                          <input
                            autocomplete="off"
                            class="st-input w-100"
                            name="text"
                            type="string"
                            value={yAxis.label.text}
                            on:input={event => {
                              const { value } = getTarget(event);
                              const newRowYAxes = yAxes.map(axis => {
                                if (axis.id === yAxis.id) {
                                  axis.label.text = value?.toString() ?? '';
                                }
                                return axis;
                              });
                              viewUpdateRow('yAxes', newRowYAxes);
                            }}
                          />
                        </Input>
                      </div>
                      <Input layout="stacked" class="editor-input">
                        <label for="tickCount">Ticks</label>
                        <input
                          class="st-input w-100"
                          name="tickCount"
                          type="number"
                          min="1"
                          value={yAxis.tickCount}
                          on:input={event => updateYAxisTickCount(event, yAxis)}
                        />
                      </Input>
                      <TimelineEditorYAxisSettings
                        {yAxis}
                        {yAxes}
                        {simulationDataAvailable}
                        on:delete={() => handleDeleteYAxisClick(yAxis)}
                      />
                      <button
                        on:click={() => handleDeleteYAxisClick(yAxis)}
                        use:tooltip={{ content: 'Delete Y Axis', placement: 'top' }}
                        class="st-button icon"
                      >
                        <TrashIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div />
          {/if}
        </fieldset>
      {/if}
      <fieldset class="editor-section editor-section-draggable">
        <div class="editor-section-header editor-section-header-with-button">
          <div class="st-typography-medium">Layers</div>
          <button
            on:click={handleNewLayerClick}
            use:tooltip={{ content: 'New Layer', placement: 'top' }}
            class="st-button icon"
          >
            <PlusIcon />
          </button>
        </div>
        {#if layers.length}
          <div class="editor-section-labeled-grid-container">
            <CssGrid columns="1fr 0.75fr 24px 24px 24px" gap="8px" class="editor-section-grid" padding="0px 16px">
              <div>Filter</div>
              <div>Layer Type</div>
            </CssGrid>
            <!-- TODO bug when dragging something into a different draggable area -->
            <div
              class="timeline-layers timeline-elements"
              on:consider={handleDndConsiderLayers}
              on:finalize={handleDndFinalizeLayers}
              use:dndzone={{
                items: layers,
                transformDraggedElement,
                type: 'rows',
              }}
            >
              {#each layers as layer (layer.id)}
                <div class="timeline-layer timeline-element">
                  <CssGrid columns="1fr 0.75fr 24px 24px 24px" gap="8px" class="editor-section-grid">
                    <span class="drag-icon">
                      <GripVerticalIcon />
                    </span>
                    <TimelineEditorLayerFilter
                      values={getFilterValuesForLayer(layer)}
                      options={getFilterOptionsForLayer(layer)}
                      {layer}
                      on:change={event => {
                        const { values } = event.detail;
                        handleUpdateLayerFilter(values, layer);
                      }}
                    />
                    <select
                      class="st-select w-100"
                      name="chartType"
                      value={layer.chartType}
                      on:change={event => handleUpdateLayerChartType(event, layer)}
                    >
                      <option value="activity">Activity</option>
                      <option value="line">Line</option>
                      <option value="x-range">X-Range</option>
                    </select>
                    <TimelineEditorLayerSettings
                      {layer}
                      on:input={event => handleUpdateLayerProperty(event, layer)}
                      on:delete={() => handleDeleteLayerClick(layer)}
                      {yAxes}
                    />

                    {#if layer.chartType === 'activity'}
                      <ColorPresetsPicker
                        presetColors={[
                          '#FFD1D2',
                          '#FFCB9E',
                          '#fcdd8f',
                          '#CAEBAE',
                          '#C9E4F5',
                          '#F8CCFF',
                          '#ECE0F2',
                          '#E8D3BE',
                          '#F5E9DA',
                          '#EBEBEB',
                        ]}
                        tooltipText="Layer Color"
                        value={getColorForLayer(layer)}
                        on:input={event => handleUpdateLayerColor(event, layer)}
                      />
                    {:else if layer.chartType === 'line'}
                      <ColorPresetsPicker
                        presetColors={[
                          '#e31a1c',
                          '#ff7f0e',
                          '#fcbd21',
                          '#75b53b',
                          '#3C95C9',
                          '#8d41b0',
                          '#CAB2D6',
                          '#a67c52',
                          '#E8CAA2',
                          '#7f7f7f',
                        ]}
                        tooltipText="Layer Color"
                        value={getColorForLayer(layer)}
                        on:input={event => handleUpdateLayerColor(event, layer)}
                      />
                    {:else if layer.chartType === 'x-range'}
                      <ColorSchemePicker
                        layout="compact"
                        value={getColorForLayer(layer)}
                        on:input={event => handleUpdateLayerColorScheme(event, layer)}
                      />
                    {/if}

                    <button
                      on:click={() => handleDeleteLayerClick(layer)}
                      use:tooltip={{ content: 'Delete Layer', placement: 'top' }}
                      class="st-button icon"
                    >
                      <TrashIcon />
                    </button>
                  </CssGrid>
                  <TimelineEditorLayerSelectedFilters
                    chartType={layer.chartType}
                    filters={getFilterValuesForLayer(layer)}
                    on:remove={event => handleDeleteLayerFilterValue(layer, event.detail.filter)}
                  />
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div />
        {/if}
      </fieldset>
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

  .editor-section-draggable .timeline-rows.timeline-elements {
    display: flex;
    flex-direction: column;
  }

  .editor-section-header .st-button.icon,
  .timeline-row .st-button.icon,
  .guide .st-button.icon,
  .timeline-y-axis .st-button.icon,
  .timeline-layer .st-button.icon,
  :global(.timeline-editor-layer-settings.st-button.icon),
  :global(.timeline-editor-axis-settings.st-button.icon) {
    color: var(--st-gray-50);
  }

  .editor-section-header-with-button {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .editor-section-draggable {
    padding: 0;
  }

  .editor-section-draggable .editor-section-header {
    padding: 16px 16px 0;
  }

  .editor-section-draggable .timeline-elements {
    display: grid;
    gap: 4px;
  }

  .editor-section-labeled-grid-container {
    display: grid;
    gap: 8px;
  }

  .editor-section-draggable .editor-section-labeled-grid-container {
    gap: 4px;
  }

  .editor-section-draggable .timeline-elements {
    outline: none !important;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 16px;
  }

  :global(.editor-section-grid form) {
    display: grid;
  }

  :global(.editor-section-grid) {
    align-items: center;
    flex: 1;
    position: relative;
    width: 100%;
  }

  :global(.editor-section-grid-labels > *) {
    min-width: 40px;
  }

  .timeline-row {
    align-items: center;
    display: flex;
    height: 40px;
    justify-content: space-between;
    overflow: hidden;
    padding: 0px 16px;
    position: relative;
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

  .timeline-row-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }

  .timeline-row-buttons {
    display: flex;
  }

  .editor-section-draggable .timeline-element:hover .drag-icon,
  :global(.timeline-element-dragging) .drag-icon {
    display: flex;
  }

  .timeline-layers {
    display: flex;
    flex-direction: column;
  }

  .timeline-layer,
  .timeline-y-axis {
    padding: 4px 16px;
  }

  .guides {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .guide,
  .timeline-y-axis,
  .timeline-layer {
    align-items: flex-end;
    display: flex;
  }

  .guide :global(.date-picker) {
    flex: 1;
    min-width: 168px;
  }

  :global(.input.input-stacked.editor-input) {
    display: grid;
    min-width: 40px;
    width: auto;
  }

  :global(.input.input-stacked.editor-input label) {
    display: none;
  }

  .section-back-button {
    border-radius: 0;
    flex-shrink: 0;
    gap: 8px;
    height: 32px;
    justify-content: flex-start;
  }

  .timeline-layer {
    align-items: flex-start;
    flex-direction: column;
  }
</style>
