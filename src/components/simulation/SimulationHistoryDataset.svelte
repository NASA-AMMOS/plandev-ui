<svelte:options immutable={true} />

<script lang="ts">
  import PinPauseIcon from '@nasa-jpl/stellar/icons/pin_pause.svg?component';
  import PinPlayIcon from '@nasa-jpl/stellar/icons/pin_play.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { SimulationDataset } from '../../types/simulation';
  import { getDoyTime, getTimeAgo } from '../../utilities/time';
  import Input from '../form/Input.svelte';

  export let checked: boolean = false;
  export let simulationDataset: SimulationDataset;
  export let planStartTimeMs: number;
  export let planEndTimeMs: number;

  const dispatch = createEventDispatcher();
  const planDuration = planEndTimeMs - planStartTimeMs;

  let timeVizRangeLeft = 0;
  let timeVizRangeWidth = 0;
  let startTimeText = '';
  let endTimeText = '';

  $: timeVizRangeWidthStyle = timeVizRangeWidth < 1 ? '4px' : `${timeVizRangeWidth}%`;

  $: {
    // Compute time range left and width
    if (simulationDataset.simulation_start_time) {
      const simulationStartTimeMS = new Date(simulationDataset.simulation_start_time).getTime();
      timeVizRangeLeft = ((simulationStartTimeMS - planStartTimeMs) / planDuration) * 100 || 0;

      if (simulationStartTimeMS === planStartTimeMs) {
        startTimeText = 'Plan Start';
      } else {
        startTimeText = getDoyTime(new Date(simulationDataset.simulation_start_time)).split('+')[0];
      }

      if (simulationDataset.simulation_end_time) {
        const simulationEndTimeMS = new Date(simulationDataset.simulation_end_time).getTime();
        timeVizRangeWidth = ((simulationEndTimeMS - simulationStartTimeMS) / planDuration) * 100 || 0;

        if (simulationEndTimeMS === planEndTimeMs) {
          endTimeText = 'Plan End';
        } else {
          endTimeText = getDoyTime(new Date(simulationDataset.simulation_end_time)).split('+')[0];
        }
      }
    }
  }
</script>

<button class="simulation-dataset st-typography-label" class:active={checked} on:click={() => dispatch('click')}>
  <div class="simulation-dataset-top-row">
    <div class="simulation-dataset-input-container">
      <Input class="simulation-dataset-input">
        <input {checked} type="checkbox" tabIndex={-1} />
      </Input>
      ID: {simulationDataset.id}
    </div>
    <div class="simulation-dataset-metadata">
      <div class="simulation-dataset-metadata-time-ago">
        {getTimeAgo(new Date(simulationDataset.requested_at))}
      </div>
      <div class="simulation-dataset-metadata-user">
        @{simulationDataset.requested_by || 'Unknown User'}
      </div>
    </div>
  </div>

  <div class="simulation-range-indicator">
    <div class="simulation-range-label start"><PinPlayIcon />{startTimeText}</div>
    <div class="simulation-range-label end">{endTimeText}<PinPauseIcon /></div>
  </div>

  <div class="simulation-range-visualiztion">
    <div class="simulation-range-background">
      <div
        class="simulation-range-fill"
        style={`margin-left: ${timeVizRangeLeft}%; width: ${timeVizRangeWidthStyle}`}
      />
    </div>
  </div>
</button>

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
    opacity: 0.8;
    padding: 8px;
  }

  .simulation-dataset.active {
    opacity: 1;
  }

  .simulation-dataset.active {
    opacity: 1;
  }

  .simulation-dataset:hover {
    background: var(--st-button-tertiary-hover-background-color);
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

  .simulation-dataset.active .simulation-range-label :global(svg) {
    color: var(--st-gray-60);
  }

  .simulation-range-label.start {
    margin-left: -3px;
    text-align: left;
  }

  .simulation-range-label.end {
    margin-right: -3px;
    text-align: right;
  }

  .simulation-range-label.start:before {
    /* White color block for the interior of the start icon's cut out so
    that the gradient does not appear inside the icon */
    background: white;
    content: ' ';
    height: 5px;
    left: 6px;
    position: absolute;
    top: 4px;
    width: 5px;
    z-index: 0;
  }

  .simulation-range-label.start:after {
    background: linear-gradient(90deg, #717171 54.17%, rgba(188, 188, 188, 0) 104.17%);
    content: ' ';
    height: 16px;
    left: 8px;
    opacity: 0.15;
    position: absolute;
    top: 0;
    width: 12px;
    z-index: -1;
  }

  .simulation-range-label.end:before {
    /* White color block for the interior of the end icon's cut out so
    that the gradient does not appear inside the icon */
    background: white;
    content: ' ';
    height: 6px;
    position: absolute;
    right: 6px;
    top: 3px;
    width: 5px;
    z-index: 0;
  }

  .simulation-range-label.end:after {
    background: linear-gradient(270deg, #717171 45.83%, rgba(188, 188, 188, 0) 95.83%);
    content: ' ';
    height: 16px;
    opacity: 0.15;
    position: absolute;
    right: 8px;
    top: 0px;
    width: 12px;
    z-index: -1;
  }

  .simulation-dataset.active .simulation-range-label.start:after,
  .simulation-dataset.active .simulation-range-label.end:after {
    opacity: 0.3;
  }

  .simulation-range-visualiztion {
    width: 100%;
  }

  .simulation-range-background {
    align-items: center;
    background: var(--st-gray-20);
    border-radius: 4px;
    display: flex;
    height: 4px;
    padding: 1px;
  }

  .simulation-range-fill {
    background: var(--st-gray-90);
    border-radius: 2px;
    height: 2px;
  }
</style>
