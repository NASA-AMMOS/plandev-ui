<svelte:options immutable={true} />

<script lang="ts">
  import { TimeTypes } from '../../enums/time';
  import { viewTimeRange } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import type { TimeRange } from '../../types/timeline';
  import { formatDate, getDoyTimeComponents, validateTime } from '../../utilities/time';

  export let window: TimeRange;
  export let message: string | null | undefined = undefined;

  let isDoyPattern = false;
  let violationMessage: string = '';
  let startDateString: string = '';
  let endDateString: string = '';

  $: startDateString = formatDate(new Date(window.start), $plugins.time.primary.format);
  $: endDateString = formatDate(new Date(window.end), $plugins.time.primary.format);
  $: isDoyPattern = validateTime(startDateString, TimeTypes.ABSOLUTE);
  $: violationMessage = message?.trim() ?? '';

  function zoomToViolation(window: TimeRange): void {
    $viewTimeRange = window;
  }
</script>

<button class="st-button tertiary violation-button" on:click={() => zoomToViolation(window)}>
  <div class="violation-time-range">
    <div>
      {#if isDoyPattern}
        {@const {
          doy: startDoy,
          hours: startHours,
          mins: startMins,
          msecs: startMsecs,
          secs: startSecs,
          year: startYear,
        } = getDoyTimeComponents(new Date(window.start))}
        {startYear}-<span class="st-typography-bold">{startDoy}</span> T {startHours}:{startMins}:{startSecs}.{startMsecs}
        {$plugins.time.primary.label}
      {:else}
        {startDateString}
      {/if}
    </div>
    <div class="separator">–</div>
    <div>
      {#if isDoyPattern}
        {@const {
          doy: endDoy,
          hours: endHours,
          mins: endMins,
          msecs: endMsecs,
          secs: endSecs,
          year: endYear,
        } = getDoyTimeComponents(new Date(window.end))}
        {endYear}-<span class="st-typography-bold">{endDoy}</span> T {endHours}:{endMins}:{endSecs}.{endMsecs}
        {$plugins.time.primary.label}
      {:else}
        {endDateString}
      {/if}
    </div>
  </div>
  {#if violationMessage}
    <div class="violation-message st-typography-label">
      {violationMessage}
    </div>
  {/if}
</button>

<style>
  .violation-time-range {
    display: flex;
    gap: 8px;
  }

  .violation-message {
    white-space: normal;
  }

  .violation-button {
    align-items: flex-start;
    flex-direction: column;
    font-variant: tabular-nums;
    gap: 4px;
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
