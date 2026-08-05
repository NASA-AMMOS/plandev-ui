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
    // A base of 1 or less has no logarithm, and a cleared input reports NaN. Drop the event rather
    // than persist a value that would make the tick ladder degenerate.
    if (!Number.isFinite(base) || base <= 1) {
      return;
    }
    const newRowYAxes = yAxes.map(axis => (axis.id === yAxis.id ? { ...axis, logBase: base } : axis));
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
      <Input layout="inline">
        <label for="scaleType">Scale</label>
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
          <label for="logBase">Log Base</label>
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
        <label for="autofitDomain">Domain Fitting</label>
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
