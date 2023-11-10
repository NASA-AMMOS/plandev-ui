<script lang="ts">
  import PinPauseIcon from '@nasa-jpl/stellar/icons/pin_pause.svg?component';
  import PinPlayIcon from '@nasa-jpl/stellar/icons/pin_play.svg?component';
  import type { ScaleTime } from 'd3-scale';
  import type { SimulationDataset } from '../../types/simulation';
  import TimelineSimulationRangeCursor from './TimelineSimulationRangeCursor.svelte';

  export let cursorHeaderHeight: number = 20;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let simulationDataset: SimulationDataset | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;

  $: if (simulationDataset !== null) {
    onSimulationDatasetChange(simulationDataset, xScaleView);
  }

  let simRangeWidth: number = 0;
  let simCursorStartX: number = -1;
  let simCursorEndX: number = -1;
  let simRangeStartX: number = -1;
  let simRangeEndX: number = -1;

  function onSimulationDatasetChange(
    simulationDataset: SimulationDataset,
    xScaleView: ScaleTime<number, number> | null,
  ) {
    if (
      simulationDataset !== null &&
      simulationDataset.simulation_start_time !== null &&
      simulationDataset.simulation_end_time !== null &&
      xScaleView !== null
    ) {
      const simStartUnixEpochTime = new Date(simulationDataset.simulation_start_time).getTime();
      const simEndUnixEpochTime = new Date(simulationDataset.simulation_end_time).getTime();
      const simStartX = xScaleView(simStartUnixEpochTime);
      const simEndX = xScaleView(simEndUnixEpochTime);

      simCursorStartX = simStartX < 0 || simStartX > drawWidth ? -1 : simStartX + marginLeft;
      simCursorEndX = simEndX < 0 || simEndX > drawWidth ? -1 : simEndX + marginLeft;
      simRangeStartX = Math.max(0, simStartX);
      simRangeEndX = Math.min(xScaleView(xScaleView.domain()[1].getTime()), simEndX);
      simRangeWidth = simRangeEndX - simRangeStartX;
    }
  }
</script>

{#if simulationDataset}
  <div class="timeline-simulation-range-margin" style="height: {cursorHeaderHeight}px" />
  <div class="timeline-simulation-range-container">
    <div class="timeline-simulation-range-header" />
    {#if simRangeWidth > 0}
      <div
        class="timeline-simulation-range-bar"
        style={`transform: translateX(${simRangeStartX}px); width: ${simRangeWidth}px; margin-left: ${marginLeft}px`}
      />
    {/if}
    {#if simCursorStartX >= 0}
      <TimelineSimulationRangeCursor tooltipContent="Simulation Start" x={simCursorStartX}>
        <div class="play-icon">
          <PinPlayIcon />
        </div>
      </TimelineSimulationRangeCursor>
    {/if}
    {#if simCursorEndX >= 0}
      <TimelineSimulationRangeCursor tooltipContent="Simulation End" x={simCursorEndX}>
        <div class="pause-icon">
          <PinPauseIcon />
        </div>
      </TimelineSimulationRangeCursor>
    {/if}
  </div>
{/if}

<style>
  .timeline-simulation-range-margin {
    position: relative;
  }

  .timeline-simulation-range-container {
    height: 100%;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 4;
  }

  .timeline-simulation-range-header {
    height: 1rem;
    position: relative;
  }

  .timeline-simulation-range-bar {
    background: #fdde8f;
    height: 13px;
    left: 0;
    opacity: 0.3;
    pointer-events: none;
    position: absolute;
    top: -13px;
    transform: translateX(0);
  }

  .play-icon:before {
    background: white;
    content: ' ';
    height: 5px;
    left: 6px;
    position: absolute;
    top: 4px;
    width: 5px;
    z-index: -1;
  }

  .pause-icon:before {
    background: white;
    content: ' ';
    height: 6px;
    position: absolute;
    right: 6px;
    top: 3px;
    width: 5px;
    z-index: -1;
  }
</style>
