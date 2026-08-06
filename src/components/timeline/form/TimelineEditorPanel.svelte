<svelte:options immutable={true} />

<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import DuplicateIcon from '@nasa-jpl/stellar/icons/duplicate.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import { GripVertical } from 'lucide-svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { ViewDefaultDiscreteOptions } from '../../../constants/view';
  import { ViewConstants } from '../../../enums/view';
  import { viewTimeRange } from '../../../stores/plan';
  import { yAxesWithScaleDomainsCache } from '../../../stores/simulation';
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
  import type {
    ActivityLayer,
    ActivityOptions,
    Axis,
    ChartType,
    DiscreteOptions,
    ExternalEventLayer,
    ExternalEventOptions,
    HorizontalGuide,
    MarkerStyle,
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
    DEFAULT_MARKER_STYLE,
    createHorizontalGuide,
    createTimelineActivityLayer,
    createTimelineExternalEventLayer,
    createTimelineLineLayer,
    createTimelineXRangeLayer,
    createVerticalGuide,
    createYAxis,
    getNextLayerID,
    isActivityLayer,
    isExternalEventLayer,
    isLineLayer,
    isXRangeLayer,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPicker from '../../form/ColorPicker.svelte';
  import Input from '../../form/Input.svelte';
  import GridMenu from '../../menus/GridMenu.svelte';
  import ParameterUnits from '../../parameters/ParameterUnits.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import InfoTip from '../../ui/InfoTip.svelte';
  import Panel from '../../ui/Panel.svelte';
  import EditorSection from './TimelineEditor/EditorSection.svelte';
  import TimelineEditorGuideSettings from './TimelineEditorGuideSettings.svelte';
  import TimelineLayerEditor from './TimelineEditor/TimelineLayerEditor.svelte';
  import TimelineEditorYAxisSettings from './TimelineEditorYAxisSettings.svelte';

  export let gridSection: ViewGridSection;

  let horizontalGuides: HorizontalGuide[] = [];
  let layers: Layer[] = [];
  let activityLayers: ActivityLayer[] = [];
  let resourceLayers: (LineLayer | XRangeLayer)[] = [];
  let externalEventLayers: ExternalEventLayer[] = [];
  let timelines: Timeline[] = [];
  let rowHasNonActivityChartLayer: boolean = false;
  let rows: Row[] = [];
  let selectedTimeline: Timeline | undefined;
  let selectedRow: Row | undefined;
  let verticalGuides: VerticalGuide[] = [];
  let rowHasActivityLayer: boolean | ActivityLayer = false;
  let rowHasExternalEventLayer: boolean | ExternalEventLayer = false;
  let yAxes: Axis[] = [];

  $: selectedTimeline = $view?.definition.plan.timelines.find(t => t.id === $selectedTimelineId);
  $: rows = selectedTimeline?.rows || [];
  $: timelines = $view?.definition.plan.timelines || [];
  $: verticalGuides = selectedTimeline?.verticalGuides || [];
  $: selectedRow = rows.find(row => row.id === $selectedRowId);
  $: horizontalGuides = selectedRow?.horizontalGuides || [];
  $: yAxes = selectedRow?.yAxes || [];
  $: layers = selectedRow?.layers || [];
  $: if (layers) {
    activityLayers = [];
    resourceLayers = [];
    externalEventLayers = [];
    layers.forEach(l => {
      if (isActivityLayer(l)) {
        activityLayers.push(l);
      } else if (isLineLayer(l) || isXRangeLayer(l)) {
        resourceLayers.push(l);
      } else if (isExternalEventLayer(l)) {
        externalEventLayers.push(l);
      }
    });
  }
  $: rowHasActivityLayer = !!selectedRow?.layers.find(isActivityLayer) || false;
  $: rowHasExternalEventLayer = selectedRow?.layers.find(isExternalEventLayer) || false;
  $: rowHasNonActivityChartLayer =
    !!selectedRow?.layers.find(layer => isLineLayer(layer) || isXRangeLayer(layer)) || false;
  $: if ((rowHasActivityLayer || rowHasExternalEventLayer) && selectedRow && !selectedRow.discreteOptions) {
    viewUpdateRow('discreteOptions', ViewDefaultDiscreteOptions);
  }
  $: discreteOptions = selectedRow?.discreteOptions || { ...ViewDefaultDiscreteOptions };

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

  // TODO move to a util?
  function createTimelineLayer(chartType: Layer['chartType']): Layer {
    switch (chartType) {
      case 'line':
        return createTimelineLineLayer(timelines, yAxes);
      case 'x-range':
        return createTimelineXRangeLayer(timelines, yAxes);
      case 'externalEvent':
        return createTimelineExternalEventLayer(timelines);
      default:
        return createTimelineActivityLayer(timelines);
    }
  }

  function handleNewLayerClick(chartType: Layer['chartType']) {
    let layer = createTimelineLayer(chartType);

    // Assign yAxisId to existing value or new axis
    if (chartType === 'line' || chartType === 'x-range') {
      if (yAxes.length > 0) {
        layer.yAxisId = yAxes[0].id;
      } else {
        handleNewYAxisClick();
        layer.yAxisId = yAxes[0].id;
      }
    }

    layers = [...layers, layer];
    viewUpdateRow('layers', layers);
  }

  function handleRemoveAllLayersClick(chartType: 'activity' | 'resource' | 'externalEvent') {
    effects.deleteTimelineLayers(layers, chartType);
  }

  function handleDeleteLayerClick(layer: Layer) {
    const filteredLayers = layers.filter(l => l.id !== layer.id);
    viewUpdateRow('layers', filteredLayers);
  }

  function handleDuplicateLayer(layer: Layer) {
    const duplicatedLayer = { ...structuredClone(layer), id: getNextLayerID(timelines) };
    viewUpdateRow('layers', [...layers, duplicatedLayer]);
  }

  function handleDiscreteOptionSelectChange(event: Event, name: keyof DiscreteOptions) {
    const { value } = getTarget(event);
    viewUpdateRow('discreteOptions', { ...discreteOptions, [name]: value });
  }

  function handleActivityOptionSelectChange(event: Event, name: keyof ActivityOptions) {
    const { value } = getTarget(event);
    viewUpdateRow('discreteOptions', {
      ...discreteOptions,
      activityOptions: { ...discreteOptions.activityOptions, [name]: value },
    });
  }

  function handleExternalEventOptionSelectChange(event: Event, name: keyof ExternalEventOptions) {
    const { value } = getTarget(event);
    viewUpdateRow('discreteOptions', {
      ...discreteOptions,
      externalEventOptions: { ...discreteOptions.externalEventOptions, [name]: value },
    });
  }

  function handleMarkerStyleChange(event: Event, name: 'directiveMarker' | 'zeroDurationMarker') {
    const { value } = getTarget(event);
    viewUpdateRow('discreteOptions', { ...discreteOptions, [name]: value as MarkerStyle });
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

  /**
   * Applies one field change from a guide's settings menu. A null for the band's second bound removes
   * the field rather than storing it, which is the only way to turn a band back into a line.
   */
  function onHorizontalGuideInput(event: CustomEvent<{ name: string; value: any }>, horizontalGuide: HorizontalGuide) {
    const { name, value } = event.detail;
    const newHorizontalGuides = horizontalGuides.map(guide => {
      if (guide.id !== horizontalGuide.id) {
        return guide;
      }
      if (name === 'y2' && value === null) {
        const { y2: _removed, ...rest } = guide;
        return rest;
      }
      return { ...guide, [name]: value };
    });
    viewUpdateRow('horizontalGuides', newHorizontalGuides);
  }

  function onVerticalGuideInput(event: CustomEvent<{ name: string; value: any }>, verticalGuide: VerticalGuide) {
    const { name, value } = event.detail;
    const newVerticalGuides = verticalGuides.map(guide => {
      if (guide.id !== verticalGuide.id) {
        return guide;
      }
      if (name === 'timestamp2' && !value) {
        const { timestamp2: _removed, ...rest } = guide;
        return rest;
      }
      return { ...guide, [name]: value };
    });
    viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
  }

  function handleUpdateLayerProperty(property: string, value: string | number | boolean | object | null, layer: Layer) {
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        return {
          ...layer,
          [property]: value,
        };
      }
      return l;
    });
    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateResourceLayerChartType(value: ChartType, layer: Layer) {
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        if (isXRangeLayer(l) && value === 'line') {
          return createTimelineLineLayer(timelines, yAxes, { filter: l.filter, id: l.id, name: l.name });
        } else if (isLineLayer(l) && value === 'x-range') {
          return createTimelineXRangeLayer(timelines, yAxes, { filter: l.filter, id: l.id, name: l.name });
        }
      }
      return l;
    });

    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateLayerColor(value: string, layer: Layer) {
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        if (isActivityLayer(l)) {
          return { ...l, activityColor: value };
        } else if (isExternalEventLayer(l)) {
          return { ...l, externalEventColor: value };
        } else if (isLineLayer(l)) {
          return { ...l, lineColor: value };
        } else if (isXRangeLayer(l)) {
          return { ...l, colorScheme: value };
        }
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
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Timeline Editor" />
  </svelte:fragment>

  <div slot="body" class="timeline-editor">
    {#if !selectedRow}
      <!-- Select Timeline. -->
      <div class="timeline-select-container">
        <select
          class="st-select w-full"
          data-type="number"
          name="timelines"
          value={$selectedTimelineId}
          on:change={event => {
            const { valueAsNumber: id } = getTarget(event);
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
        <EditorSection item="Margin">
          <CssGrid columns="1fr 1fr" gap="8px" class="editor-section-grid">
            <form on:submit={event => event.preventDefault()}>
              <Input>
                <label for="marginLeft">Margin Left</label>
                <input
                  min={ViewConstants.MIN_MARGIN_LEFT}
                  class="st-input w-full"
                  name="marginLeft"
                  id="marginLeft"
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
                class="st-input w-full"
                name="marginRight"
                id="marginRight"
                type="number"
                value={selectedTimeline.marginRight}
                on:input|stopPropagation={updateTimelineEvent}
              />
            </Input>
          </CssGrid>
        </EditorSection>

        <EditorSection
          creatable
          item="Vertical Guide"
          itemCount={verticalGuides.length}
          on:create={handleNewVerticalGuideClick}
          on:removeAll={handleRemoveAllVerticalGuidesClick}
        >
          {#if verticalGuides.length}
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 24px 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
              </CssGrid>
              <div class="guides timeline-elements">
                {#each verticalGuides as verticalGuide (verticalGuide.id)}
                  <div class="guide timeline-element">
                    <CssGrid columns="1fr 24px 24px 24px" gap="8px" class="editor-section-grid">
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
                          class="st-input w-full"
                          name="text"
                          placeholder="Label"
                        />
                      </Input>
                      <div use:tooltip={{ content: 'Guide Color', placement: 'top' }}>
                        <ColorPicker
                          value={verticalGuide.label.color}
                          on:input={event => handleUpdateVerticalGuideLabel(event, verticalGuide)}
                          name="color"
                        />
                      </div>
                      <TimelineEditorGuideSettings
                        guide={verticalGuide}
                        on:input={event => onVerticalGuideInput(event, verticalGuide)}
                        on:delete={() => handleDeleteVerticalGuideClick(verticalGuide)}
                      />
                      <button
                        on:click={() => handleDeleteVerticalGuideClick(verticalGuide)}
                        use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                        class="st-button icon"
                      >
                        <CloseIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </EditorSection>

        <EditorSection
          creatable
          item="Row"
          isDragContainer
          itemCount={rows.length}
          on:create={addTimelineRow}
          on:removeAll={removeAllTimelineRows}
        >
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
                      <GripVertical size={16} />
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
                        <CloseIcon />
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div />
          {/if}
        </EditorSection>
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
          class="st-select w-full"
          data-type="number"
          name="rows"
          value={$selectedRowId}
          on:change={event => {
            const { valueAsNumber: id } = getTarget(event);
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
      <EditorSection item="Detail">
        <div style="display: grid">
          <Input>
            <label for="name">Row Name</label>
            <input
              class="st-input w-full"
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
                class="st-input w-full"
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
              class="st-select w-full"
              data-type="bool"
              name="autoAdjustHeight"
              value={selectedRow.autoAdjustHeight}
              on:change={event => {
                const { value } = getTarget(event);
                viewUpdateRow('autoAdjustHeight', value === 'true');
              }}
            >
              <option value={false}>Manual</option>
              <option value={true}>Auto</option>
            </select>
          </Input>
        </CssGrid>
      </EditorSection>

      {#if rowHasNonActivityChartLayer}
        <EditorSection
          creatable
          item="Horizontal Guide"
          itemCount={horizontalGuides.length}
          on:create={handleNewHorizontalGuideClick}
          on:removeAll={handleRemoveAllHorizontalGuidesClick}
        >
          {#if horizontalGuides.length}
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 24px 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
              </CssGrid>
              <div class="guides timeline-elements">
                {#each horizontalGuides as horizontalGuide (horizontalGuide.id)}
                  <div class="guide timeline-element">
                    <CssGrid columns="1fr 24px 24px 24px" gap="8px" class="editor-section-grid">
                      <Input layout="stacked" class="editor-input">
                        <label for="text">Label</label>
                        <input
                          value={horizontalGuide.label.text}
                          on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                          autocomplete="off"
                          class="st-input w-full"
                          name="text"
                        />
                      </Input>
                      <div use:tooltip={{ content: 'Guide Color', placement: 'top' }}>
                        <ColorPicker
                          value={horizontalGuide.label.color}
                          on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                          name="color"
                        />
                      </div>
                      <TimelineEditorGuideSettings
                        guide={horizontalGuide}
                        {yAxes}
                        on:input={event => onHorizontalGuideInput(event, horizontalGuide)}
                        on:delete={() => handleDeleteHorizontalGuideClick(horizontalGuide)}
                      />
                      <button
                        on:click={() => handleDeleteHorizontalGuideClick(horizontalGuide)}
                        use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                        class="st-button icon"
                      >
                        <CloseIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </EditorSection>
      {/if}
      {#if rowHasActivityLayer || rowHasExternalEventLayer}
        <EditorSection
          item="Layer Option"
          on:create={handleNewHorizontalGuideClick}
          on:removeAll={handleRemoveAllHorizontalGuidesClick}
        >
          <form on:submit={event => event.preventDefault()} style="flex: 1">
            <Input layout="inline" class="editor-input">
              <label for="text">Height</label>
              <input
                min={12}
                autocomplete="off"
                class="st-input w-full"
                name="text"
                type="number"
                value={discreteOptions.height}
                on:input={event => {
                  const { value } = getTarget(event);
                  if (typeof value === 'number' && !isNaN(value)) {
                    if (value >= 12) {
                      viewUpdateRow('discreteOptions', { ...discreteOptions, height: value });
                    }
                  }
                }}
              />
              <ParameterUnits unit="px" slot="right" />
            </Input>
          </form>
          <Input layout="inline" class="editor-input">
            <!-- A select rather than the icon radio group the other options use: the two modes are not
                 distinguishable from their icons alone, and the text captions hide entirely below the
                 panel's 360px compact threshold, which left this control unreadable exactly when the
                 panel was narrow enough to need it most. -->
            <div class="editor-label">
              <label for="display-mode">Display</label>
              <InfoTip
                content="Grouped puts activities into collapsible rows by type. Compact packs them into as few rows as will fit."
              />
            </div>
            <select
              class="st-select w-full"
              id="display-mode"
              name="displayMode"
              value={discreteOptions.displayMode}
              on:change={event => handleDiscreteOptionSelectChange(event, 'displayMode')}
            >
              <option value="grouped">Grouped</option>
              <option value="compact">Compact</option>
            </select>
          </Input>
          <Input layout="inline" class="editor-input">
            <div class="editor-label">
              <label for="label-visibility">Labels</label>
              <InfoTip
                content="On always draws item labels. Off never does. Auto draws only the labels that do not overlap the next item."
              />
            </div>
            <select
              class="st-select w-full"
              id="label-visibility"
              name="labelVisibility"
              value={discreteOptions.labelVisibility}
              on:change={event => handleDiscreteOptionSelectChange(event, 'labelVisibility')}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
              <option value="auto">Auto</option>
            </select>
          </Input>
          {#if rowHasActivityLayer}
            <Input layout="inline" class="editor-input">
              <div class="editor-label">
                <label for="directive-marker">Directive</label>
                <InfoTip
                  content="Shape every activity directive is drawn with. Directives mark a start time and have no duration of their own."
                />
              </div>
              <select
                class="st-select w-full"
                id="directive-marker"
                name="directiveMarker"
                value={discreteOptions.directiveMarker ?? DEFAULT_MARKER_STYLE}
                on:change={event => handleMarkerStyleChange(event, 'directiveMarker')}
              >
                <option value="line">Line</option>
                <option value="dot">Dot</option>
                <option value="diamond">Diamond</option>
              </select>
            </Input>
          {/if}
          <Input layout="inline" class="editor-input">
            <div class="editor-label">
              <label for="zero-duration-marker">Milestone</label>
              <InfoTip
                content="Shape for spans and external events whose duration is zero. Anything with a duration keeps its bar."
              />
            </div>
            <select
              class="st-select w-full"
              id="zero-duration-marker"
              name="zeroDurationMarker"
              value={discreteOptions.zeroDurationMarker ?? DEFAULT_MARKER_STYLE}
              on:change={event => handleMarkerStyleChange(event, 'zeroDurationMarker')}
            >
              <option value="line">Line</option>
              <option value="dot">Dot</option>
              <option value="diamond">Diamond</option>
            </select>
          </Input>
          {#if rowHasActivityLayer}
            <div class="editor-section-header activity-options">
              <div class="st-typography-label">Activity Options</div>
            </div>
            <Input layout="inline" class="editor-input">
              <div class="editor-label">
                <label for="activity-composition">Show</label>
                <InfoTip
                  content="Directives shows only what is planned. Simulated shows only what simulation produced. Both draws the simulated span with its directive marked on it."
                />
              </div>
              <select
                class="st-select w-full"
                id="activity-composition"
                name="composition"
                value={discreteOptions?.activityOptions?.composition}
                on:change={event => handleActivityOptionSelectChange(event, 'composition')}
              >
                <option value="directives">Directives</option>
                <option value="spans">Simulated</option>
                <option value="both">Both</option>
              </select>
            </Input>
          {/if}
          {#if rowHasActivityLayer && discreteOptions.displayMode === 'grouped'}
            <Input layout="inline" class="editor-input">
              <div class="editor-label">
                <label for="hierarchy-mode">Hierarchy</label>
                <InfoTip
                  content="By Directive groups starting from each directive. Flat groups directives and spans together regardless of how deeply nested they are."
                />
              </div>
              <select
                class="st-select w-full"
                id="hierarchy-mode"
                name="hierarchyMode"
                value={discreteOptions?.activityOptions?.hierarchyMode}
                on:change={event => handleActivityOptionSelectChange(event, 'hierarchyMode')}
              >
                <option value="directive">By Directive</option>
                <option value="flat">Flat</option>
              </select>
            </Input>
          {/if}
          {#if rowHasExternalEventLayer && discreteOptions.displayMode === 'grouped'}
            <div class="editor-section-header external-event-options">
              <div class="st-typography-label">External Event Options</div>
            </div>
            <Input layout="inline" class="editor-input">
              <div class="editor-label">
                <label for="group-by">Group By</label>
                <InfoTip
                  content="Groups external events into rows either by the source file they came from, or by their event type."
                />
              </div>
              <select
                class="st-select w-full"
                id="group-by"
                name="groupBy"
                value={discreteOptions?.externalEventOptions?.groupBy}
                on:change={event => handleExternalEventOptionSelectChange(event, 'groupBy')}
              >
                <option value="source_key">By Source</option>
                <option value="event_type_name">By Event Type</option>
              </select>
            </Input>
          {/if}
        </EditorSection>
      {/if}
      <!-- TODO perhaps separate out each section into a mini editor? -->

      {#if yAxes.length > 0 || rowHasNonActivityChartLayer}
        <EditorSection
          isDragContainer
          creatable
          item="Y Axis"
          itemPlural="Y Axes"
          itemCount={yAxes.length}
          on:create={handleNewYAxisClick}
          on:removeAll={handleRemoveAllYAxesClick}
        >
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
                        <GripVertical size={16} />
                      </span>
                      <div class="w-full">
                        <Input layout="stacked" class="editor-input">
                          <label for="text">Y Axis</label>
                          <input
                            autocomplete="off"
                            class="st-input w-full"
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
                          class="st-input w-full"
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
                        <CloseIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div />
          {/if}
        </EditorSection>
      {/if}
      <EditorSection
        creatable
        item="Activity Layer"
        itemCount={activityLayers.length}
        on:create={() => handleNewLayerClick('activity')}
        on:removeAll={() => handleRemoveAllLayersClick('activity')}
      >
        {#if activityLayers.length}
          <div class="timeline-layers timeline-elements">
            {#each activityLayers as layer (layer.id)}
              <TimelineLayerEditor
                {yAxes}
                {layer}
                on:updateLayer={({ detail: { property, value } }) => handleUpdateLayerProperty(property, value, layer)}
                on:colorChange={({ detail: { color } }) => handleUpdateLayerColor(color, layer)}
                on:remove={() => handleDeleteLayerClick(layer)}
                on:duplicate={() => handleDuplicateLayer(layer)}
                on:filterChange={({ detail: { filter } }) =>
                  handleUpdateLayerProperty('filter', { activity: filter }, layer)}
              />
            {/each}
          </div>
        {/if}
      </EditorSection>
      <EditorSection
        creatable
        item="Resource Layer"
        itemCount={resourceLayers.length}
        on:create={() => handleNewLayerClick('line')}
        on:removeAll={() => handleRemoveAllLayersClick('resource')}
      >
        {#if resourceLayers.length}
          <!-- TODO bug when dragging something into a different draggable area -->
          <div class="timeline-layers timeline-elements">
            {#each resourceLayers as layer (layer.id)}
              <TimelineLayerEditor
                {layer}
                {yAxes}
                on:updateLayer={({ detail: { property, value } }) => handleUpdateLayerProperty(property, value, layer)}
                on:updateChartType={({ detail: chartType }) => handleUpdateResourceLayerChartType(chartType, layer)}
                on:colorChange={({ detail: { color } }) => handleUpdateLayerColor(color, layer)}
                on:remove={() => handleDeleteLayerClick(layer)}
                on:duplicate={() => handleDuplicateLayer(layer)}
                on:filterChange={({ detail: { filter } }) =>
                  handleUpdateLayerProperty('filter', { resource: filter }, layer)}
              />
              <!-- <TimelineEditorLayerSection
                on:handleUpdateResourceLayerChartType={event => handleUpdateResourceLayerChartType(event.detail.value, layer)}
                on:handleUpdateLayerFilter={event => handleUpdateLayerFilter(event.detail.values, layer)}
                on:handleUpdateLayerProperty={event =>
                  handleUpdateLayerProperty(event.detail.name, event.detail.value, layer)}
                on:handleUpdateLayerColorScheme={event => handleUpdateLayerColorScheme(event.detail.value, layer)}
                on:handleDeleteLayerClick={() => handleDeleteLayerClick(layer)}
                {layer}
                {yAxes}
              /> -->
            {/each}
          </div>
        {/if}
      </EditorSection>
      <EditorSection
        creatable
        item="Event Layer"
        itemCount={externalEventLayers.length}
        on:create={() => handleNewLayerClick('externalEvent')}
        on:removeAll={() => handleRemoveAllLayersClick('externalEvent')}
      >
        {#if externalEventLayers.length}
          <div class="timeline-layers timeline-elements">
            {#each externalEventLayers as layer (layer.id)}
              <TimelineLayerEditor
                {layer}
                on:updateLayer={({ detail: { property, value } }) => handleUpdateLayerProperty(property, value, layer)}
                on:rename={({ detail: { name } }) => handleUpdateLayerProperty('name', name, layer)}
                on:colorChange={({ detail: { color } }) => handleUpdateLayerColor(color, layer)}
                on:remove={() => handleDeleteLayerClick(layer)}
                on:duplicate={() => handleDuplicateLayer(layer)}
                on:filterChange={({ detail: { filter } }) =>
                  handleUpdateLayerProperty('filter', { externalEvent: filter }, layer)}
              />
            {/each}
          </div>
        {/if}
      </EditorSection>
    {/if}
  </div>
</Panel>

<style>
  .activity-options {
    border-top: 1px solid var(--st-gray-20);
    padding-top: 16px;
  }

  .external-event-options {
    border-top: 1px solid var(--st-gray-20);
    padding-top: 16px;
  }

  .timeline-editor {
    display: flex;
    flex-direction: column;
  }
  .timeline-select-container {
    border-bottom: 1px solid var(--st-gray-20);
    padding: 16px 8px;
  }

  .timeline-row .st-button.icon,
  .guide .st-button.icon,
  .timeline-y-axis .st-button.icon,
  :global(.timeline-editor-layer-settings.st-button.icon),
  :global(.timeline-editor-axis-settings.st-button.icon) {
    color: var(--st-gray-50);
  }

  .editor-section-labeled-grid-container {
    display: grid;
    gap: 8px;
  }

  .editor-section-labeled-grid-container {
    gap: 4px;
  }

  .timeline-elements {
    display: block;
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
    margin-left: -16px;
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

  .timeline-element:hover .drag-icon,
  :global(.timeline-element-dragging) .drag-icon {
    display: flex;
  }

  .timeline-layers {
    display: flex;
    flex-direction: column;
  }

  .timeline-y-axis {
    padding: 4px 16px;
  }

  .guides {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .guide,
  .timeline-y-axis {
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

  /* Wide enough for the longest label in this panel ("Margin Right"). At the previous 60px, five
     existing labels were already ellipsized -- Margin Right, Margin Left, Resize Mode, Row Height and
     Hierarchy -- so this is the column being too narrow rather than any one label being too long. */
  :global(.input.input-inline.editor-input) {
    grid-template-columns: 84px auto;
    padding: 0;
  }

  .section-back-button {
    border-radius: 0;
    flex-shrink: 0;
    gap: 8px;
    height: 32px;
    justify-content: flex-start;
  }

  /* Keeps the (?) on the label's row rather than letting it wrap under a long label */
  .editor-label {
    align-items: center;
    display: flex;
    gap: 4px;
    min-width: 0;
  }
</style>
