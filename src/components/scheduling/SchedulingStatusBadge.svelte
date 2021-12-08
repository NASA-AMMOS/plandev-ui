<script lang="ts">
  import { SchedulingStatus } from '../../stores/scheduling';

  export let schedulingStatus: SchedulingStatus = SchedulingStatus.Clean;

  let color: string = '#007bff';

  $: {
    switch (schedulingStatus) {
      case SchedulingStatus.Clean:
        color = '#007bff'; // Blue.
        break;
      case SchedulingStatus.Complete:
        color = '#28a745'; // Green.
        break;
      case SchedulingStatus.Executing:
        color = '#ffc107'; // Yellow.
        break;
      case SchedulingStatus.Failed:
        color = '#dc3545'; // Red.
        break;
      case SchedulingStatus.Unknown:
      default:
        color = '#dc3545'; // Red.
        break;
    }
  }
</script>

<span class="scheduling-status" style="background-color: {color}">
  Scheduling: {schedulingStatus}
</span>

<style>
  .scheduling-status {
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
