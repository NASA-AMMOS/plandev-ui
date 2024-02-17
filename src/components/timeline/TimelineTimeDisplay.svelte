<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let width: number | undefined;
  export let planEndTimeDoy: string | undefined;
  export let planStartTimeDoy: string | undefined;
</script>

<div style:width={`${width ?? 10}px`} class="timeline-time-display">
  <div use:tooltip={{ content: 'Plan Start Time (UTC)' }} class="timeline-time-display--date st-typography-medium">
    {planStartTimeDoy} UTC
  </div>

  <div use:tooltip={{ content: 'Plan End Time (UTC)' }} class="timeline-time-display--date st-typography-medium">
    {planEndTimeDoy} UTC
  </div>
</div>

<style>
  .timeline-time-display {
    display: flex;
    flex-direction: column;
    gap: 2px;
    justify-content: center;
    padding: 4px 8px 4px;
  }

  .timeline-time-display--date {
    color: var(--st-gray-70);
    display: flex;
    font-size: 11px;
    font-variant: tabular-nums;
    padding: 0 4px;
    width: max-content;
  }
</style>
