<svelte:options immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { yAxesWithScaleDomainsCache } from '../../../stores/simulation';
  import { selectedRow, viewUpdateRow } from '../../../stores/views';
  import type { Axis, AxisDomainFitMode, AxisScaleType, ComputedAxis } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { DEFAULT_AXIS_SCALE_TYPE, DEFAULT_LOG_BASE } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';
  import InfoTip from '../../ui/InfoTip.svelte';

  export let yAxis: Axis;
  export let yAxes: Axis[];

  let axisMenu: Menu;

  const dispatch = createEventDispatcher<{
    delete: void;
  }>();

  // The cache and row are passed in rather than read inside the function, because Svelte does not
  // track store reads that happen inside a function body -- reading them there would evaluate this
  // once against an empty cache and then never re-run.
  $: computedAxis = getComputedAxis($yAxesWithScaleDomainsCache, $selectedRow?.id, yAxis.id);
  $: effectiveScaleDomain = (computedAxis?.scaleDomain ?? []) as number[];

  function onDeleteAxis() {
    dispatch('delete');
  }

  function getComputedAxis(
    cache: Record<number, ComputedAxis[]>,
    rowId: number | undefined,
    axisId: number,
  ): ComputedAxis | undefined {
    if (rowId === undefined) {
      return undefined;
    }
    return cache[rowId]?.find(axis => axis.id === axisId);
  }

  function updateYAxisAutofit(event: Event) {
    const { value: v } = getTarget(event);
    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        const domainFitMode = v as AxisDomainFitMode;
        const { scaleDomain, ...rest } = axis;
        const newAxis: Axis = { ...rest, domainFitMode };
        if (domainFitMode === 'manual') {
          newAxis.scaleDomain = effectiveScaleDomain;
        }
        return newAxis;
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisScaleType(event: Event) {
    const { value: v } = getTarget(event);
    const newRowYAxes = yAxes.map(axis => (axis.id === yAxis.id ? { ...axis, scaleType: v as AxisScaleType } : axis));
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisLogBase(event: Event) {
    const { value: v } = getTarget(event);
    const base = v as number;
    // Integer bases from 2 up, matching the input's own min/step and the view schema. A base of 1 or
    // less has no logarithm at all, and a fractional one labels values nobody reads a plot in. A
    // cleared or partly typed field reports NaN, and typing 10 passes through 1 -- so a rejected value
    // is dropped rather than persisted, and the field settles on the next keystroke.
    if (!Number.isInteger(base) || base < 2) {
      return;
    }
    const newRowYAxes = yAxes.map(axis => (axis.id === yAxis.id ? { ...axis, logBase: base } : axis));
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisStack(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const newRowYAxes = yAxes.map(axis => (axis.id === yAxis.id ? { ...axis, stack: checked } : axis));
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisTickLines(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        return { ...axis, renderTickLines: checked };
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisScaleDomain(event: Event, yAxis: Axis) {
    const { name, value: v } = getTarget(event);
    const numberValue = v as number;
    const value = isNaN(numberValue) ? null : numberValue;
    let scaleDomain = yAxis.scaleDomain ? [...yAxis.scaleDomain] : [];

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
        return { ...axis, scaleDomain };
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }
</script>

<button
  class="st-button icon timeline-editor-axis-settings"
  use:tooltip={{ content: 'Axis Settings', placement: 'top' }}
  style="position: relative"
  on:click|stopPropagation={() => axisMenu.toggle()}
>
  <div class="button-inner"><SettingsIcon /></div>
  <Menu bind:this={axisMenu} hideAfterClick={false} placement="bottom-end" width={280}>
    <MenuHeader title="Y Axis Settings" />
    <div class="body st-typography-body">
      <Input layout="inline">
        <label for="renderTickLines">Horizontal Ticks</label>
        <input
          style:width="max-content"
          checked={yAxis.renderTickLines}
          id="renderTickLines"
          on:change={event => updateYAxisTickLines(event)}
          type="checkbox"
        />
      </Input>
      <!-- Every explanation in this menu is an InfoTip rather than a tooltip on the control itself: a
           bare control gives no sign an explanation exists, so nobody went looking for one. -->
      <Input layout="inline">
        <div class="flex min-w-0 items-center gap-1">
          <label for="stack">Stack Layers</label>
          <InfoTip
            content="Sums this axis's line layers bottom-up in layer order, so each line sits on the total of the ones beneath it and the top line is the total. Area fills follow, stopping at the layer below rather than at zero."
          />
        </div>
        <input
          style:width="max-content"
          checked={yAxis.stack ?? false}
          id="stack"
          on:change={updateYAxisStack}
          type="checkbox"
        />
      </Input>
      <Input layout="inline">
        <div class="flex min-w-0 items-center gap-1">
          <label for="scaleType">Scale</label>
          <InfoTip
            content="Logarithmic compresses a range spanning several orders of magnitude into one row. Zero and negative samples still get a position -- the scale runs linear across the smallest magnitude in the data and logarithmic beyond it, so a plot that touches zero is not cut off. On either scale, ticks too close together to label on a short row are dropped."
          />
        </div>
        <select
          class="st-select w-full"
          id="scaleType"
          name="scaleType"
          value={yAxis.scaleType ?? DEFAULT_AXIS_SCALE_TYPE}
          on:change={event => updateYAxisScaleType(event)}
        >
          <option value="linear">Linear</option>
          <option value="log">Logarithmic</option>
        </select>
      </Input>
      {#if (yAxis.scaleType ?? DEFAULT_AXIS_SCALE_TYPE) === 'log'}
        <Input layout="inline">
          <div class="flex min-w-0 items-center gap-1">
            <label for="logBase">Log Base</label>
            <InfoTip
              content="Which values get a tick, one power of this base apart. 10 gives decades, 2 gives octaves. It changes the labels only -- nothing moves on the plot."
            />
          </div>
          <input
            min={2}
            step={1}
            class="st-input w-full"
            id="logBase"
            name="logBase"
            type="number"
            value={yAxis.logBase ?? DEFAULT_LOG_BASE}
            on:input={event => updateYAxisLogBase(event)}
          />
        </Input>
      {/if}
      <Input layout="inline">
        <div class="flex min-w-0 items-center gap-1">
          <label for="autofitDomain">Domain Fitting</label>
          <InfoTip
            content="What the axis bounds follow. Autofit Plan fixes them to the whole plan, so the line keeps its shape while you zoom. Autofit Time Window refits to whatever is on screen, so a small variation fills the row. Manual holds the min and max you enter."
          />
        </div>
        <select
          class="st-select w-full"
          name="autofitDomain"
          value={yAxis.domainFitMode}
          on:change={event => updateYAxisAutofit(event)}
        >
          <option value="fitPlan">Autofit Plan</option>
          <option value="fitTimeWindow">Autofit Time Window</option>
          <option value="manual">Manual</option>
        </select>
      </Input>

      {#if yAxis.domainFitMode === 'manual'}
        <Input layout="inline" class="editor-input">
          <label for="domainMin">Min</label>
          <input
            class="st-input w-full"
            name="domainMin"
            disabled={yAxis.domainFitMode !== 'manual'}
            type="number"
            value={yAxis.scaleDomain ? yAxis.scaleDomain[0] : 0}
            on:input={event => updateYAxisScaleDomain(event, yAxis)}
          />
        </Input>
        <Input layout="inline" class="editor-input">
          <label for="domainMax">Max</label>
          <input
            class="st-input w-full"
            name="domainMax"
            disabled={yAxis.domainFitMode !== 'manual'}
            type="number"
            value={yAxis.scaleDomain ? yAxis.scaleDomain[1] : 1}
            on:input={event => updateYAxisScaleDomain(event, yAxis)}
          />
        </Input>
      {/if}
      <button class="st-button secondary w-full" style="position: relative" on:click={onDeleteAxis}>Delete Axis</button>
    </div>
  </Menu>
</button>

<style>
  .button-inner {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .body {
    cursor: auto;
    display: grid;
    gap: 8px;
    padding: 8px;
    text-align: left;
  }

  .body :global(.input-inline) {
    padding: 0;
  }

  .timeline-editor-axis-settings :global(.color-picker) {
    width: min-content;
  }
</style>
