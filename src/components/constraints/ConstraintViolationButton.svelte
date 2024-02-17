<svelte:options immutable={true} />

<script lang="ts">
  import { viewTimeRange } from '../../stores/plan';
  import type { TimeRange } from '../../types/timeline';
  import { getDoyTimeComponents } from '../../utilities/time';

  export let window: TimeRange;

  $: ({
    doy: startDoy,
    hours: startHours,
    mins: startMins,
    msecs: startMsecs,
    secs: startSecs,
    year: startYear,
  } = getDoyTimeComponents(new Date(window.start)));

  $: ({
    doy: endDoy,
    hours: endHours,
    mins: endMins,
    msecs: endMsecs,
    secs: endSecs,
    year: endYear,
  } = getDoyTimeComponents(new Date(window.end)));

  function zoomToViolation(window: TimeRange): void {
    $viewTimeRange = window;
  }
</script>

<button class="st-button tertiary violation-button" on:click={() => zoomToViolation(window)}>
  <div>
    {startYear}-<span class="st-typography-bold">{startDoy}</span> T {startHours}:{startMins}:{startSecs}.{startMsecs} UTC
  </div>

  <div class="separator">–</div>
  <div>
    {endYear}-<span class="st-typography-bold">{endDoy}</span> T {endHours}:{endMins}:{endSecs}.{endMsecs} UTC
  </div>
</button>

<style>
  .violation-button {
    font-variant: tabular-nums;
    gap: 8px;
    height: auto;
    justify-content: flex-start;
    letter-spacing: 0px;
    min-height: 24px;
    padding: 8px 8px;
    text-align: left;
    user-select: auto;
  }

  .violation-button span {
    letter-spacing: -0px;
  }

  .separator {
    color: var(--st-gray-40);
  }
</style>
