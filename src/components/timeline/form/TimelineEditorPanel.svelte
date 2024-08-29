<svelte:options immutable={true} />

<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import DuplicateIcon from '@nasa-jpl/stellar/icons/duplicate.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import RemoveAllIcon from '@nasa-jpl/stellar/icons/remove_all.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import ActivityModeTextNoneIcon from '../../../assets/text-none.svg?component';
  import ActivityModeTextIcon from '../../../assets/text.svg?component';
  import ActivityModeCompactIcon from '../../../assets/timeline-activity-mode-compact.svg?component';
  import ActivityModeGroupedIcon from '../../../assets/timeline-activity-mode-grouped.svg?component';
  import DirectiveAndSpanIcon from '../../../assets/timeline-directive-and-span.svg?component';
  import DirectiveIcon from '../../../assets/timeline-directive.svg?component';
  import HierarchyModeDirectiveIcon from '../../../assets/timeline-hierarchy-mode-directive.svg?component';
  import HierarchyModeFlatIcon from '../../../assets/timeline-hierarchy-mode-flat.svg?component';
  import SpanIcon from '../../../assets/timeline-span.svg?component';
  import ActivityModeWidthIcon from '../../../assets/width.svg?component';
  import {
    ViewActivityLayerColorPresets,
    ViewDefaultActivityOptions,
    ViewLineLayerColorPresets,
  } from '../../../constants/view';
  import { ViewConstants } from '../../../enums/view';
  import { activityTypes, maxTimeRange, viewTimeRange } from '../../../stores/plan';
  import { plugins } from '../../../stores/plugins';
  import { externalResourceNames, resourceTypes, yAxesWithScaleDomainsCache } from '../../../stores/simulation';
  import {
    selectedRowId,
    selectedTimelineId,
    view,
    viewAddTimelineRow,
    viewSetSelectedRow,
    viewSetSelectedTimeline,
    viewUpdateRow,
    viewUpdateTimeline,
  } from '../../../stores/views';
  import type { ActivityType } from '../../../types/activity';
  import type { RadioButtonId } from '../../../types/radio-buttons';
  import type {
    ActivityLayer,
    ActivityOptions,
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
    createTimelineActivityLayer,
    createTimelineLineLayer,
    createTimelineXRangeLayer,
    createVerticalGuide,
    createYAxis,
    isActivityLayer,
    isLineLayer,
    isXRangeLayer,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPicker from '../../form/ColorPicker.svelte';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import ColorSchemePicker from '../../form/ColorSchemePicker.svelte';
  import Input from '../../form/Input.svelte';
  import GridMenu from '../../menus/GridMenu.svelte';
  import ParameterUnits from '../../parameters/ParameterUnits.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import Panel from '../../ui/Panel.svelte';
  import RadioButton from '../../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../../ui/RadioButtons/RadioButtons.svelte';
  import TimelineEditorLayerFilter from './TimelineEditorLayerFilter.svelte';
  import TimelineEditorLayerSelectedFilters from './TimelineEditorLayerSelectedFilters.svelte';
  import TimelineEditorLayerSettings from './TimelineEditorLayerSettings.svelte';
  import TimelineEditorYAxisSettings from './TimelineEditorYAxisSettings.svelte';

  export let gridSection: ViewGridSection;

  let activityOptions: ActivityOptions = { ...ViewDefaultActivityOptions };
  let horizontalGuides: HorizontalGuide[] = [];
  let editorWidth: number;
  let layers: Layer[] = [];
  let timelines: Timeline[] = [];
  let rowHasActivityLayer: boolean = false;
  let rowHasNonActivityChartLayer: boolean = false;
  let rows: Row[] = [];
  let selectedTimeline: Timeline | undefined;
  let selectedRow: Row | undefined;
  let verticalGuides: VerticalGuide[] = [];
  let yAxes: Axis[] = [];

  $: selectedTimeline = $view?.definition.plan.timelines.find(t => t.id === $selectedTimelineId);
  $: rows = selectedTimeline?.rows || [];
  $: timelines = $view?.definition.plan.timelines || [];
  $: verticalGuides = selectedTimeline?.verticalGuides || [];
  $: selectedRow = rows.find(row => row.id === $selectedRowId);
  $: horizontalGuides = selectedRow?.horizontalGuides || [];
  $: yAxes = selectedRow?.yAxes || [];
  $: layers = selectedRow?.layers || [];
  $: rowHasActivityLayer = !!selectedRow?.layers.find(isActivityLayer) || false;
  $: rowHasNonActivityChartLayer =
    !!selectedRow?.layers.find(layer => isLineLayer(layer) || isXRangeLayer(layer)) || false;
  $: if (rowHasActivityLayer && selectedRow && !selectedRow.activityOptions) {
    viewUpdateRow('activityOptions', ViewDefaultActivityOptions);
  }
  $: activityOptions = selectedRow?.activityOptions || { ...ViewDefaultActivityOptions };

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

  function handleRemoveAllYAxesClick() {
    effects.deleteTimelineYAxes();
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

  function handleRemoveAllLayersClick() {
    effects.deleteTimelineLayers();
  }

  function handleDeleteLayerClick(layer: Layer) {
    const filteredLayers = layers.filter(l => l.id !== layer.id);
    viewUpdateRow('layers', filteredLayers);
  }

  function handleDeleteLayerFilterValue(layer: Layer, value: string) {
    const newValues = getFilterValuesForLayer(layer).filter(i => value !== i);
    handleUpdateLayerFilter(newValues, layer);
  }

  function handleActivityOptionRadioChange(event: CustomEvent<{ id: RadioButtonId }>, name: keyof ActivityOptions) {
    const { id } = event.detail;
    viewUpdateRow('activityOptions', { ...activityOptions, [name]: id });
  }

  function addTimelineRow() {
    viewAddTimelineRow();
  }

  function removeAllTimelineRows() {
    if (!selectedTimeline) {
      return;
    }

    effects.deleteTimelineRows($selectedTimelineId);
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
        if (isActivityLayer(currentLayer)) {
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
        if (isActivityLayer(l)) {
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
    if (!selectedRow) {
      return;
    }
    const yAxesWithScaleDomains = $yAxesWithScaleDomainsCache[selectedRow.id];
    const newHorizontalGuide = createHorizontalGuide(timelines, yAxesWithScaleDomains);
    viewUpdateRow('horizontalGuides', [...horizontalGuides, newHorizontalGuide]);
  }

  function handleRemoveAllHorizontalGuidesClick() {
    effects.deleteTimelineHorizontalGuides();
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

  function handleRemoveAllVerticalGuidesClick() {
    effects.deleteTimelineVerticalGuides($selectedTimelineId);
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
    if (isActivityLayer(layer)) {
      return layer.activityColor;
    } else if (isLineLayer(layer)) {
      return layer.lineColor;
    } else if (isXRangeLayer(layer)) {
      return layer.colorScheme;
    }
  }

  function getFilterValuesForLayer(layer: Layer) {
    if (isActivityLayer(layer)) {
      const activityLayer = layer;
      const activityTypes = activityLayer.filter?.activity?.types ?? [];
      return [...activityTypes];
    } else if (isLineLayer(layer) || isXRangeLayer(layer)) {
      const resourceLayer = layer;
      const resourceNames = resourceLayer.filter?.resource?.names ?? [];
      return [...resourceNames];
    }
    return [];
  }

  function getFilterOptionsForLayer(layer: Layer, activityTypes: ActivityType[], externalResourceNames: string[]) {
    if (isActivityLayer(layer)) {
      return activityTypes.map(t => t.name);
    } else if (isLineLayer(layer) || isXRangeLayer(layer)) {
      return $resourceTypes
        .map(t => t.name)
        .concat(externalResourceNames)
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

  <div slot="body" bind:clientWidth={editorWidth} class="timeline-editor" class:compact={editorWidth < 360}>
    {#if !selectedRow}
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
      {#if !selectedTimeline}
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
                  value={selectedTimeline.marginLeft}
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
                value={selectedTimeline.marginRight}
                on:input|stopPropagation={updateTimelineEvent}
              />
            </Input>
          </CssGrid>
        </fieldset>

        <fieldset class="editor-section">
          <div class="editor-section-header editor-section-header-with-button">
            <div class="st-typography-medium">Vertical Guides</div>
            <div>
              {#if verticalGuides.length}
                <button
                  on:click|stopPropagation={handleRemoveAllVerticalGuidesClick}
                  use:tooltip={{ content: 'Delete All Vertical Guides', placement: 'top' }}
                  class="st-button icon"
                >
                  <RemoveAllIcon />
                </button>
              {/if}
              <button
                on:click={handleNewVerticalGuideClick}
                use:tooltip={{ content: 'New Vertical Guide', placement: 'top' }}
                class="st-button icon"
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          {#if verticalGuides.length}
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 168px 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
                <div>Date ({$plugins.time.primary.label})</div>
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
            <div>
              {#if rows.length}
                <button
                  on:click|stopPropagation={removeAllTimelineRows}
                  use:tooltip={{ content: 'Delete All Rows', placement: 'top' }}
                  class="st-button icon"
                >
                  <RemoveAllIcon />
                </button>
              {/if}
              <button
                on:click={addTimelineRow}
                use:tooltip={{ content: 'New Row', placement: 'top' }}
                class="st-button icon"
              >
                <PlusIcon />
              </button>
            </div>
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
                          if (selectedTimeline) {
                            effects.duplicateTimelineRow(row, selectedTimeline, timelines);
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
              value={selectedRow.name}
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
                disabled={selectedRow.autoAdjustHeight}
                class="st-input w-100"
                name="height"
                type="number"
                value={selectedRow.height}
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
              value={selectedRow.autoAdjustHeight}
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
            <div>
              {#if horizontalGuides.length}
                <button
                  on:click|stopPropagation={handleRemoveAllHorizontalGuidesClick}
                  use:tooltip={{ content: 'Delete All Horizontal Guides', placement: 'top' }}
                  class="st-button icon"
                >
                  <RemoveAllIcon />
                </button>
              {/if}
              <button
                on:click={handleNewHorizontalGuideClick}
                use:tooltip={{ content: 'New Horizontal Guide', placement: 'top' }}
                class="st-button icon"
              >
                <PlusIcon />
              </button>
            </div>
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
      {#if rowHasActivityLayer}
        <fieldset class="editor-section">
          <div class="editor-section-header">
            <div class="st-typography-medium">Activity Options</div>
          </div>
          <Input layout="inline" class="editor-input">
            <label for="activity-composition">Display</label>
            <RadioButtons
              selectedButtonId={activityOptions.displayMode}
              on:select-radio-button={e => handleActivityOptionRadioChange(e, 'displayMode')}
            >
              <RadioButton
                use={[[tooltip, { content: 'Group activities by type in collapsible rows', placement: 'top' }]]}
                id="grouped"
              >
                <div class="radio-button-icon">
                  <ActivityModeGroupedIcon />
                  <span class="timeline-editor-responsive-label">Grouped</span>
                </div>
              </RadioButton>
              <RadioButton
                use={[[tooltip, { content: 'Pack activities into a single row', placement: 'top' }]]}
                id="compact"
              >
                <div class="radio-button-icon">
                  <ActivityModeCompactIcon />
                  <span class="timeline-editor-responsive-label">Compact</span>
                </div>
              </RadioButton>
            </RadioButtons>
          </Input>
          <Input layout="inline" class="editor-input">
            <label for="activity-composition">Labels</label>
            <RadioButtons
              selectedButtonId={activityOptions.labelVisibility}
              on:select-radio-button={e => handleActivityOptionRadioChange(e, 'labelVisibility')}
            >
              <RadioButton use={[[tooltip, { content: 'Always show labels', placement: 'top' }]]} id="on">
                <div class="radio-button-icon">
                  <ActivityModeTextIcon />
                  <span class="timeline-editor-responsive-label">On</span>
                </div>
              </RadioButton>
              <RadioButton use={[[tooltip, { content: 'Never show labels', placement: 'top' }]]} id="off">
                <div class="radio-button-icon">
                  <ActivityModeTextNoneIcon />
                  <span class="timeline-editor-responsive-label">Off</span>
                </div>
              </RadioButton>
              <RadioButton
                use={[[tooltip, { content: 'Show labels that do not overlap', placement: 'top' }]]}
                id="auto"
              >
                <div class="radio-button-icon">
                  <ActivityModeWidthIcon />
                  <span class="timeline-editor-responsive-label">Auto</span>
                </div>
              </RadioButton>
            </RadioButtons>
          </Input>
          <Input layout="inline" class="editor-input">
            <label for="activity-composition">Show</label>
            <RadioButtons
              id="activity-composition"
              selectedButtonId={activityOptions.composition}
              on:select-radio-button={e => handleActivityOptionRadioChange(e, 'composition')}
            >
              <RadioButton use={[[tooltip, { content: 'Only show directives', placement: 'top' }]]} id="directives">
                <div class="radio-button-icon">
                  <DirectiveIcon /><span class="timeline-editor-responsive-label">Directives</span>
                </div>
              </RadioButton>
              <RadioButton use={[[tooltip, { content: 'Only show simulated', placement: 'top' }]]} id="spans">
                <div class="radio-button-icon">
                  <SpanIcon />
                  <span class="timeline-editor-responsive-label">Simulated</span>
                </div>
              </RadioButton>
              <RadioButton
                use={[[tooltip, { content: 'Show directives and simulated activities', placement: 'top' }]]}
                id="both"
              >
                <div class="radio-button-icon">
                  <DirectiveAndSpanIcon />
                  <span class="timeline-editor-responsive-label">Both</span>
                </div>
              </RadioButton>
            </RadioButtons>
          </Input>
          {#if activityOptions.displayMode === 'grouped'}
            <Input layout="inline" class="editor-input">
              <label for="activity-composition">Hierarchy</label>
              <RadioButtons
                selectedButtonId={activityOptions.hierarchyMode}
                on:select-radio-button={e => handleActivityOptionRadioChange(e, 'hierarchyMode')}
              >
                <RadioButton
                  use={[[tooltip, { content: 'Group starting with directives', placement: 'top' }]]}
                  id="directive"
                >
                  <div class="radio-button-icon">
                    <HierarchyModeDirectiveIcon />
                    <span class="timeline-editor-responsive-label">By Directive</span>
                  </div>
                </RadioButton>
                <RadioButton
                  use={[
                    [
                      tooltip,
                      { content: 'Group starting with directives and spans regardless of depth', placement: 'top' },
                    ],
                  ]}
                  id="flat"
                >
                  <div class="radio-button-icon">
                    <HierarchyModeFlatIcon />
                    <span class="timeline-editor-responsive-label">Flat</span>
                  </div>
                </RadioButton>
              </RadioButtons>
            </Input>
          {/if}
          <form on:submit={event => event.preventDefault()} style="flex: 1">
            <Input layout="inline" class="editor-input">
              <label for="text">Height</label>
              <input
                min={12}
                autocomplete="off"
                class="st-input w-100"
                name="text"
                type="number"
                value={activityOptions.activityHeight}
                on:input={event => {
                  const { value } = getTarget(event);
                  if (typeof value === 'number' && !isNaN(value)) {
                    if (value >= 12) {
                      viewUpdateRow('activityOptions', { ...activityOptions, activityHeight: value });
                    }
                  }
                }}
              />
              <ParameterUnits unit="px" slot="right" />
            </Input>
          </form>
        </fieldset>
      {/if}
      <!-- TODO perhaps separate out each section into a mini editor? -->
      {#if yAxes.length > 0 || rowHasNonActivityChartLayer}
        <fieldset class="editor-section editor-section-draggable">
          <div class="editor-section-header editor-section-header-with-button">
            <div class="st-typography-medium">Y Axes</div>
            <div>
              {#if yAxes.length}
                <button
                  on:click|stopPropagation={handleRemoveAllYAxesClick}
                  use:tooltip={{ content: 'Delete All Y Axes', placement: 'top' }}
                  class="st-button icon"
                >
                  <RemoveAllIcon />
                </button>
              {/if}
              <button
                on:click={handleNewYAxisClick}
                use:tooltip={{ content: 'New Y Axis', placement: 'top' }}
                class="st-button icon"
              >
                <PlusIcon />
              </button>
            </div>
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
                          min="0"
                          value={yAxis.tickCount}
                          on:input={event => updateYAxisTickCount(event, yAxis)}
                        />
                      </Input>
                      <TimelineEditorYAxisSettings {yAxis} {yAxes} on:delete={() => handleDeleteYAxisClick(yAxis)} />
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
          <div>
            {#if layers.length}
              <button
                on:click|stopPropagation={handleRemoveAllLayersClick}
                use:tooltip={{ content: 'Delete All Layers', placement: 'top' }}
                class="st-button icon"
              >
                <RemoveAllIcon />
              </button>
            {/if}
            <button
              on:click={handleNewLayerClick}
              use:tooltip={{ content: 'New Layer', placement: 'top' }}
              class="st-button icon"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        {#if layers.length}
          <div class="editor-section-labeled-grid-container">
            <CssGrid columns="1fr 0.75fr 24px 24px 24px" gap="8px" class="editor-section-grid" padding="0px 16px">
              <div>Filter</div>
              <div>Layer Type</div>
            </CssGrid>
            <!-- TODO bug when dragging something into a different draggable area -->
            <div class="timeline-layers timeline-elements">
              {#each layers as layer (layer.id)}
                <div class="timeline-layer timeline-element">
                  <CssGrid columns="1fr 0.75fr 24px 24px 24px" gap="8px" class="editor-section-grid">
                    <TimelineEditorLayerFilter
                      values={getFilterValuesForLayer(layer)}
                      options={getFilterOptionsForLayer(layer, $activityTypes, $externalResourceNames)}
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

                    {#if isActivityLayer(layer)}
                      <ColorPresetsPicker
                        presetColors={ViewActivityLayerColorPresets}
                        tooltipText="Layer Color"
                        value={getColorForLayer(layer)}
                        on:input={event => handleUpdateLayerColor(event, layer)}
                      />
                    {:else if isLineLayer(layer)}
                      <ColorPresetsPicker
                        presetColors={ViewLineLayerColorPresets}
                        tooltipText="Layer Color"
                        value={getColorForLayer(layer)}
                        on:input={event => handleUpdateLayerColor(event, layer)}
                      />
                    {:else if isXRangeLayer(layer)}
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
  </div>
</Panel>

<style>
  .timeline-editor {
    display: flex;
    flex-direction: column;
  }
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

  :global(.input.input-inline.editor-input) {
    grid-template-columns: 60px auto;
    padding: 0;
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

  .radio-button-icon {
    display: flex;
    gap: 4px;
  }

  .compact .timeline-editor-responsive-label {
    display: none;
  }
</style>
