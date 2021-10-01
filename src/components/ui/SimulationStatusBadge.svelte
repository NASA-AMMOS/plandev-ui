<script lang="ts">
  import { SimulationStatus } from '../../types/simulation';

  export let simulationStatus: SimulationStatus = SimulationStatus.Clean;

  let color: string = '#007bff';

  $: {
    switch (simulationStatus) {
      case SimulationStatus.Clean:
        color = '#007bff'; // Blue.
        break;
      case SimulationStatus.Complete:
        color = '#28a745'; // Green.
        break;
      case SimulationStatus.Dirty:
        color = '#dc3545'; // Red.
        break;
      case SimulationStatus.Executing:
        color = '#ffc107'; // Yellow.
        break;
      case SimulationStatus.Failed:
        color = '#dc3545'; // Red.
        break;
      case SimulationStatus.Incomplete:
        color = '#ffc107'; // Yellow.
        break;
      case SimulationStatus.Unknown:
      default:
        color = '#dc3545'; // Red.
        break;
    }
  }
</script>

<span class="simulation-status" style="background-color: {color}">
  Simulation Status: {simulationStatus}
</span>

<style>
  .simulation-status {
    align-items: center;
    border-radius: 0.25rem;
    display: inline-flex;
    font-size: 75%;
    justify-content: center;
    line-height: 1;
    margin: 0.25em 0.4em;
    padding: 0.25em 0.4em;
    vertical-align: baseline;
    white-space: nowrap;
  }
</style>
