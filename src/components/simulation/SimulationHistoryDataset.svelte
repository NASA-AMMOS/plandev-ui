<svelte:options immutable={true} />

<script lang="ts">
  import CancelIcon from '@nasa-jpl/stellar/icons/prohibited.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { InvalidDate } from '../../constants/time';
  import { Status } from '../../enums/status';
  import { planReadOnly } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import type { SimulationDataset } from '../../types/simulation';
  import { hexToRgba } from '../../utilities/color';
  import {
    formatSimulationQueuePosition,
    getSimulationExtent,
    getSimulationProgress,
    getSimulationProgressColor,
    getSimulationStatus,
    getSimulationTimestamp,
  } from '../../utilities/simulation';
  import { getHumanReadableStatus } from '../../utilities/status';
  import { formatDate, getUnixEpochTimeFromInterval, removeDateStringMilliseconds } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Card from '../ui/Card.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';

  export let selected: boolean = false;
  export let simulationDataset: SimulationDataset;
  export let planStartTimeMs: number;
  export let planEndTimeMs: number;
  export let queuePosition: number = -1;

  const dispatch = createEventDispatcher<{
    cancel: { id: number };
    click: void;
  }>();
  const planDuration = planEndTimeMs - planStartTimeMs;

  let simulationBoundsVizRangeLeft = 0;
  let simulationBoundsVizRangeWidth = 0;
  let simulationExtentVizRangeWidth = 0;
  let startTimeText: string = '';
  let endTimeText: string = '';
  let progress = 0;
  let extent: string | null = '';
  let status: Status | null = null;

  $: simulationBoundsVizRangeWidthStyle =
    simulationBoundsVizRangeWidth < 1 ? '4px' : `${simulationBoundsVizRangeWidth}%`;
  $: simulationExtentVizRangeWidthStyle =
    simulationExtentVizRangeWidth < 1
      ? '4px'
      : `${(simulationExtentVizRangeWidth / simulationBoundsVizRangeWidth) * 100}%`;

  $: {
    status = getSimulationStatus(simulationDataset);
    extent = getSimulationExtent(simulationDataset);

    // Compute time range left and width
    if (simulationDataset.simulation_start_time) {
      const simulationStartTimeMS = new Date(simulationDataset.simulation_start_time).getTime();
      simulationBoundsVizRangeLeft = Math.max(0, ((simulationStartTimeMS - planStartTimeMs) / planDuration) * 100 || 0);

      if (simulationStartTimeMS === planStartTimeMs) {
        startTimeText = 'Plan Start';
      } else {
        startTimeText = formatDate(new Date(simulationDataset.simulation_start_time), $plugins.time.primary.format);

        if (startTimeText !== InvalidDate) {
          startTimeText = removeDateStringMilliseconds(startTimeText);
        }
      }

      if (simulationDataset.simulation_end_time) {
        const simulationEndTimeMS = new Date(simulationDataset.simulation_end_time).getTime();
        simulationBoundsVizRangeWidth = Math.min(
          100,
          ((simulationEndTimeMS - simulationStartTimeMS) / planDuration) * 100 || 0,
        );

        let simulationExtentMS = 0;
        if ((status === Status.Incomplete || status === Status.Failed || status === Status.Canceled) && extent) {
          simulationExtentMS =
            getUnixEpochTimeFromInterval(simulationDataset.simulation_start_time, extent) - simulationStartTimeMS;
        } else if (status === Status.Complete) {
          simulationExtentMS = simulationEndTimeMS - simulationStartTimeMS;
        }
        progress = getSimulationProgress(simulationDataset);
        simulationExtentVizRangeWidth = (simulationExtentMS / planDuration) * 100 || 0;
        if (simulationEndTimeMS === planEndTimeMs) {
          endTimeText = 'Plan End';
        } else {
          endTimeText = formatDate(new Date(simulationDataset.simulation_end_time), $plugins.time.primary.format);

          // Remove milliseconds if DOY-like time
          if (endTimeText !== InvalidDate) {
            endTimeText = removeDateStringMilliseconds(endTimeText);
          }
        }
      }
    }
  }

  function onCancelSimulation(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    dispatch('cancel', { id: simulationDataset.id });
  }
</script>

<Card
  title={`Simulation ID: ${simulationDataset.id}`}
  date={simulationDataset.requested_at}
  user={simulationDataset.requested_by}
  {selected}
  on:click={() => dispatch('click')}
>
  <div slot="right">
    <div class="simulation-dataset-status-chip-container">
      {#if status === Status.Complete || status === Status.Failed}
        <StatusBadge status={getSimulationStatus(simulationDataset)} {progress} />
      {:else}
        <div
          class={`simulation-dataset-status-chip simulation-dataset-status-chip--${status?.toLowerCase()} st-typography-label`}
        >
          {#if status === Status.Pending}
            {formatSimulationQueuePosition(queuePosition)}
          {:else}
            {getHumanReadableStatus(status)}
          {/if}
        </div>
        {#if status === Status.Pending || status === Status.Incomplete}
          <button
            use:tooltip={{ content: 'Cancel Simulation', placement: 'top' }}
            class="st-button icon simulation-dataset-status-cancel"
            type="button"
            disabled={$planReadOnly}
            on:click={onCancelSimulation}
          >
            <CancelIcon />
          </button>
        {/if}
      {/if}
    </div>
  </div>
  <div class="simulation-range-container">
    <div class="simulation-range-indicator st-typography-label">
      <div class="simulation-range-label">{startTimeText}</div>
      <div class="simulation-range-label">{endTimeText}</div>
    </div>

    <div class="simulation-range-visualization">
      <div class="simulation-range-background">
        <div
          class="simulation-range-bounds"
          style={`margin-left: ${simulationBoundsVizRangeLeft}%; width: ${simulationBoundsVizRangeWidthStyle}; background: ${hexToRgba(
            getSimulationProgressColor(simulationDataset.status),
            0.2,
          )}`}
        >
          <div
            class="simulation-extent-fill"
            style={`margin-left: 0%; width: ${simulationExtentVizRangeWidthStyle}; background: ${getSimulationProgressColor(
              simulationDataset.status,
            )}`}
          />
        </div>
      </div>
      <div>
        {#if extent}
          <span use:tooltip={{ content: 'Simulation Time', placement: 'top' }} class="simulation-dataset-extent">
            {getSimulationTimestamp(simulationDataset)}
          </span>
        {/if}
        {progress.toFixed()}%
      </div>
    </div>
  </div>
</Card>

<style>
  .simulation-dataset {
    background: none;
    border: 1px solid var(--st-gray-15);
    border-radius: 4px;
    color: var(--st-gray-60);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .simulation-dataset.active {
    background: #0275ff05;
    border-color: #015cc836;
  }

  .simulation-dataset:hover:not(.active) {
    border-color: var(--st-gray-30);
  }

  .simulation-dataset-top-row {
    align-items: center;
    display: flex;
    gap: 8px;
    height: 24px;
    justify-content: space-between;
    width: 100%;
  }

  .simulation-dataset-input-container {
    display: flex;
    gap: 8px;
  }

  .simulation-dataset-metadata {
    display: flex;
    gap: 8px;
  }

  .simulation-dataset-metadata {
    color: var(--st-gray-50) dataset-metadata-time-ago;
    display: flex;
    gap: 8px;
  }

  .simulation-dataset-metadata-user {
    color: var(--st-gray-70);
  }

  .simulation-dataset-metadata-time-ago {
    color: var(--st-gray-50);
  }

  .simulation-dataset-top-row :global(.input.simulation-dataset-input) {
    width: min-content;
  }

  .simulation-dataset-top-row :global(.input.simulation-dataset-input input) {
    cursor: pointer;
    margin: 0;
    padding: 0;
  }

  .simulation-range-indicator {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .simulation-range-label {
    display: flex;
    gap: 8px;
    position: relative;
    z-index: 0;
  }

  .simulation-range-label :global(svg) {
    color: var(--st-gray-40);
    flex-shrink: 0;
    z-index: 0;
  }

  .simulation-range-visualization {
    align-items: center;
    display: flex;
    gap: 4px;
    width: 100%;
  }

  .simulation-range-background {
    align-items: center;
    background: var(--st-gray-20);
    border-radius: 8px;
    display: flex;
    flex: 1;
    height: 4px;
  }

  .simulation-range-bounds {
    align-items: center;
    background: var(--st-gray-40);
    border-radius: 8px;
    display: flex;
    height: 4px;
  }

  .simulation-extent-fill {
    background: var(--st-gray-90);
    border-radius: 8px;
    height: 4px;
    transition: width 250ms;
  }

  .simulation-dataset-status-chip {
    border-radius: 16px;
    padding: 4px 8px;
  }
  .simulation-dataset-status-chip--incomplete {
    background: #d1dbf13d;
    color: #295eda;
  }
  .simulation-dataset-status-chip--pending {
    background: var(--st-gray-15);
    color: var(--st-gray-70);
  }
  .simulation-dataset-status-chip--canceled {
    background: #f1d1d13d;
    color: #c34242;
  }

  .simulation-dataset-status-container {
    display: flex;
    gap: 4px;
  }

  .simulation-dataset-status-cancel {
    border-radius: 16px;
    color: var(--st-gray-60);
  }

  .simulation-dataset-status-cancel:hover:disabled {
    cursor: not-allowed;
  }

  .simulation-dataset-status-cancel:hover:enabled {
    background: var(--st-gray-30);
    color: var(--st-gray-80);
  }

  .simulation-dataset-extent {
    color: var(--st-gray-50);
  }

  .simulation-range-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    width: 100%;
  }

  .simulation-dataset-status-chip-container {
    display: flex;
    gap: 4px;
  }
</style>
