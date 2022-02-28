<script lang="ts">
  import { ExecutionStatus } from '../../utilities/enums';

  export let status: ExecutionStatus = ExecutionStatus.Clean;
  export let title: string = '';

  const colors: Record<string, string> = {
    blue: '#007bff',
    green: '#28a745',
    red: '#dc3545',
    yellow: '#ffc107',
  };

  let color: string = colors.blue;

  $: if (status === ExecutionStatus.Clean) {
    color = colors.blue;
  } else if (status === ExecutionStatus.Complete) {
    color = colors.green;
  } else if (status === ExecutionStatus.Dirty) {
    color = colors.red;
  } else if (status === ExecutionStatus.Executing) {
    color = colors.yellow;
  } else if (status === ExecutionStatus.Failed) {
    color = colors.red;
  } else if (ExecutionStatus.Incomplete) {
    color = colors.yellow;
  } else {
    color = colors.red;
  }
</script>

<span class="status-badge" style="background-color: {color}">
  {title}: {status}
</span>

<style>
  .status-badge {
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
