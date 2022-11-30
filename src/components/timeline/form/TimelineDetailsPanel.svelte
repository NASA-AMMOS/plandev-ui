<svelte:options immutable={true} />

<script lang="ts">
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { get } from 'svelte/store';
  import DatePickerField from '../../../components/form/DatePickerField.svelte';
  import Input from '../../../components/form/Input.svelte';
  import { field } from '../../../stores/form';
  import { maxTimeRange, viewTimeRange } from '../../../stores/plan';
  import {
    selectedTimeline,
    selectedTimelineId,
    view,
    viewSetSelectedTimeline,
    viewUpdateTimeline,
  } from '../../../stores/views';
  import { getTarget } from '../../../utilities/generic';
  import { getDoyTime } from '../../../utilities/time';
  import { createRow, createVerticalGuide } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import { required, timestamp } from '../../../utilities/validators';
  import GridMenu from '../../menus/GridMenu.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import Panel from '../../ui/Panel.svelte';

  export let gridId: number;

  let rows: Row[] = [];
  let verticalGuideFieldMap: Record<number, FieldStore<string>> = {};

  $: rows = $selectedTimeline?.rows || [];
  $: verticalGuides = $selectedTimeline?.verticalGuides || [];

  $: if (verticalGuides) {
    verticalGuideFieldMap = verticalGuides.reduce((map, guide) => {
      if (!map[guide.id]) {
        map[guide.id] = field<string>(guide.timestamp, [required, timestamp]);
      }
      return map;
    }, {});
  }

  function updateTimelineEvent(event: Event) {
    event.stopPropagation();
    const { name, value } = getTarget(event);
    viewUpdateTimeline(name, value);
  }

  function addTimelineRow() {
    if (!$selectedTimeline) {
      return;
    }

    const row = createRow($selectedTimeline.rows);
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

  function handleDeleteGuideClick(verticalGuide: VerticalGuide) {
    const filteredVerticalGuides = verticalGuides.filter(guide => guide.id !== verticalGuide.id);
    viewUpdateTimeline('verticalGuides', filteredVerticalGuides, $selectedTimelineId);
  }

  function handleUpdateGuide(verticalGuide: VerticalGuide) {
    const filteredVerticalGuides = verticalGuides.map(guide => {
      if (guide.id === verticalGuide.id) {
        const field = verticalGuideFieldMap[guide.id];
        guide.timestamp = get(field).value;
      }
      return guide;
    });
    viewUpdateTimeline('verticalGuides', filteredVerticalGuides, $selectedTimelineId);
  }

  function handleNewGuideClick() {
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
    const el = draggedEl.querySelector('.row') as HTMLElement;
    el.style.background = 'var(--st-gray-10)';
    el.classList.add('test');
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
    <GridMenu {gridId} title="Timeline Details" />
  </svelte:fragment>

  <svelte:fragment slot="body">
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

    <!-- Timeline -->
    {#if !$selectedTimeline}
      <fieldset class="editor-section">No timeline selected</fieldset>
    {:else}
      <fieldset class="editor-section">
        <div class="st-typography-medium editor-section-header">Margins</div>
        <CssGrid columns="1fr 1fr" gap="8px">
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
        </CssGrid>
      </fieldset>

      <fieldset class="editor-section">
        <div class="editor-section-header editor-section-header-with-button">
          <div class="st-typography-medium">Vertical Guides</div>
          <button
            on:click={handleNewGuideClick}
            use:tooltip={{ content: 'New Vertical Guide', placement: 'top' }}
            class="st-button icon"
          >
            <PlusIcon />
          </button>
        </div>
        {#if verticalGuides.length}
          <div>
            {#each verticalGuides as verticalGuide (verticalGuide.id)}
              <div class="vertical-guide">
                <DatePickerField
                  minDate={new Date($maxTimeRange.start)}
                  maxDate={new Date($maxTimeRange.end)}
                  layout="inline"
                  label={`Guide ${verticalGuide.id}`}
                  field={verticalGuideFieldMap[verticalGuide.id]}
                  on:change={() => handleUpdateGuide(verticalGuide)}
                  on:keydown={() => handleUpdateGuide(verticalGuide)}
                />
                <button
                  on:click={() => handleDeleteGuideClick(verticalGuide)}
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
          class="rows"
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
              <div class="st-typography-body row">
                <span class="drag-icon">
                  <GripVerticalIcon />
                </span>
                {row.name}
                <button use:tooltip={{ content: 'Edit Row', placement: 'top' }} class="st-button icon">
                  <PenIcon />
                </button>
              </div>
            </div>
          {/each}
        </div>
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

  .editor-section-header .st-button.icon,
  .row .st-button.icon,
  .vertical-guide .st-button.icon {
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

  .rows {
    min-height: 100px;
    outline: none !important;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 16px;
  }

  .row {
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

  .row:hover,
  .row:active {
    background: var(--st-gray-10);
  }

  .row:hover .drag-icon,
  :global(.test) .drag-icon {
    display: flex;
  }

  .vertical-guide {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .vertical-guide :global(.date-picker-field) {
    flex: 1;
  }
</style>
