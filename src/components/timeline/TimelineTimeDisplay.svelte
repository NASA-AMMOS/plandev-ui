<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let width: number | undefined;
  export let planStartTime: string | undefined;
  export let planEndTime: string | undefined;
  export let timeLabel: string = '';
</script>

<div style:width={`${width ?? 10}px`} class="timeline-time-display">
  <div use:tooltip={{ content: `Plan Start Time` }} class="timeline-time-display--date st-typography-medium">
    {planStartTime}
    {timeLabel}
  </div>

  <div use:tooltip={{ content: `Plan End Time` }} class="timeline-time-display--date st-typography-medium">
    {planEndTime}
    {timeLabel}
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
