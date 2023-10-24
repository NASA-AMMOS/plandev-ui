<svelte:options immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { viewTimeRange } from '../../../stores/plan';
  import { resourcesByViewLayerId } from '../../../stores/simulation';
  import { selectedRow, selectedTimeline, viewUpdateRow } from '../../../stores/views';
  import type { Axis, AxisDomainFitMode } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { getYAxisBounds } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';

  export let yAxis: Axis;
  export let yAxes: Axis[];
  export let simulationDataAvailable: boolean = false;

  let axisMenu: Menu;

  const dispatch = createEventDispatcher();

  function onDeleteAxis() {
    dispatch('delete');
  }

  function getManualFitScaleDomain() {
    let scaleDomain: number[] = [];
    if ($selectedRow && $selectedTimeline) {
      scaleDomain = getYAxisBounds(
        { ...yAxis, domainFitMode: 'fitTimeWindow' },
        $selectedRow.layers,
        $resourcesByViewLayerId,
        $viewTimeRange,
      );
    }
    return scaleDomain;
  }

  function onFitAxis() {
    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        const newAxis: Axis = { ...axis };
        let scaleDomain: number[] = [];

        // Get bounds for initial values if possible using current time window
        if ($selectedRow && $selectedTimeline) {
          scaleDomain = getManualFitScaleDomain();
        }
        return { ...newAxis, scaleDomain };
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function updateYAxisAutofit(event: Event) {
    const { value: v } = getTarget(event);
    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        const domainFitMode = v as AxisDomainFitMode;
        const { scaleDomain, ...rest } = axis;
        const newAxis: Axis = { ...rest, domainFitMode };
        if (domainFitMode === 'manual') {
          newAxis.scaleDomain = getManualFitScaleDomain();
        }
        return newAxis;
      }
      return axis;
    });
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
        <label for="autofitDomain">Domain Fitting</label>
        <select
          class="st-select w-100"
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
            class="st-input w-100"
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
            class="st-input w-100"
            name="domainMax"
            disabled={yAxis.domainFitMode !== 'manual'}
            type="number"
            value={yAxis.scaleDomain ? yAxis.scaleDomain[1] : 1}
            on:input={event => updateYAxisScaleDomain(event, yAxis)}
          />
        </Input>
        <div
          use:tooltip={{
            content: simulationDataAvailable
              ? 'Fit axis bounds to domain of in-view axis resources'
              : 'Axis bounds fit only available after simulation',
            placement: 'top',
          }}
        >
          <button class="st-button secondary w-100" disabled={!simulationDataAvailable} on:click={onFitAxis}
            >Fit Axis Bounds</button
          >
        </div>
      {/if}
      <button class="st-button secondary w-100" style="position: relative" on:click={onDeleteAxis}>Delete Axis</button>
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
