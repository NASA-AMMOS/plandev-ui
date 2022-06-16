<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getColorForStatus, Status, statusColors } from '../../utilities/status';

  export let status: Status = Status.Clean;
  export let title: string = '';
  export let titleWidth: string = '90px';

  const dispatch = createEventDispatcher();

  let color: string = statusColors.blue;

  $: color = getColorForStatus(status);
</script>

<span class="status-badge" style="background: {color}" on:click={() => dispatch('click')}>
  <span class="status">
    {status}
  </span>
  <span class="title" style:width={titleWidth}>
    <i class="bi bi-play-btn" />
    {title}
  </span>
</span>

<style>
  .status-badge {
    align-items: center;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    font-size: 11px;
    font-weight: 500;
    justify-content: center;
    letter-spacing: 0.025em;
    line-height: 1;
    white-space: nowrap;
  }

  .status {
    align-items: center;
    color: var(--st-gray-90);
    display: inline-flex;
    justify-content: center;
    padding: 5px;
    width: 90px;
  }

  .title {
    align-items: center;
    background: var(--st-gray-20);
    border-bottom-right-radius: 4px;
    border-top-right-radius: 4px;
    color: var(--st-gray-80);
    display: inline-flex;
    gap: 5px;
    justify-content: center;
    padding: 5px;
  }
</style>
