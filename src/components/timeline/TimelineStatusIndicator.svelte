<svelte:options immutable={true} />

<script lang="ts">
  import { ChartSpline, LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { derived, type Readable } from 'svelte/store';
  import { Status } from '../../enums/status';
  import { activityDirectivesDB } from '../../stores/activities';
  import { constraintRuns } from '../../stores/constraints';
  import { selectedExternalEventsRaw } from '../../stores/external-event';
  import { schedulingAnalysisStatus } from '../../stores/scheduling';
  import { initialSpansLoading, simulationStatus } from '../../stores/simulation';
  import {
    timelineResourcesErroring,
    timelineResourcesLoading,
    timelineResourcesOversized,
  } from '../../stores/timelineResourceStatus';
  import { tooltip } from '../../utilities/tooltip';

  type StatusError = { message: string; source: string };

  // Profile subs flip out of `loading` on first batch; without this the
  // indicator would hide mid-sim while data is still streaming.
  const simulationStreaming: Readable<boolean> = derived(
    simulationStatus,
    $simulationStatus => $simulationStatus === Status.Pending || $simulationStatus === Status.Incomplete,
  );

  // Scheduling produces new activities and typically re-simulates, so keep the
  // indicator up while a scheduling run is in flight.
  const schedulingRunning: Readable<boolean> = derived(
    schedulingAnalysisStatus,
    $schedulingAnalysisStatus =>
      $schedulingAnalysisStatus === Status.Pending || $schedulingAnalysisStatus === Status.Incomplete,
  );

  const loading: Readable<boolean> = derived(
    [
      timelineResourcesLoading,
      initialSpansLoading,
      activityDirectivesDB.loading,
      constraintRuns.loading,
      selectedExternalEventsRaw.loading,
      simulationStreaming,
      schedulingRunning,
    ],
    values => values.some(Boolean),
  );

  const errors: Readable<StatusError[]> = derived(
    [timelineResourcesErroring, activityDirectivesDB.error, constraintRuns.error, selectedExternalEventsRaw.error],
    ([resourceErrs, directivesErr, constraintsErr, eventsErr]) => {
      const out: StatusError[] = [];
      resourceErrs.forEach(e => {
        const label = e.kind === 'external' ? 'External profile' : 'Profile';
        out.push({ message: e.error, source: `${label} ${e.name}` });
      });
      if (directivesErr) {
        out.push({ message: directivesErr, source: 'Activity directives' });
      }
      if (constraintsErr) {
        out.push({ message: constraintsErr, source: 'Constraint runs' });
      }
      if (eventsErr) {
        out.push({ message: eventsErr, source: 'External events' });
      }
      return out;
    },
  );

  $: errorCount = $errors.length;
  $: hasError = errorCount > 0;
  // `\n` renders as a line break — tooltip.css sets white-space: pre-line
  // on .tippy-content globally.
  $: errorTooltip = hasError ? $errors.map(e => `${e.source}: ${e.message}`).join('\n') : '';

  // Surfaced separately from errors: nothing is broken, but a profile this large slows the
  // timeline down and almost always indicates a fixed-cadence resource in the mission model.
  $: oversizedCount = $timelineResourcesOversized.length;
  $: hasOversized = oversizedCount > 0;
  $: oversizedTooltip = hasOversized
    ? [
        oversizedCount === 1
          ? 'A profile on this timeline is large enough to slow rendering:'
          : `${oversizedCount} profiles on this timeline are large enough to slow rendering:`,
        ...$timelineResourcesOversized.map(r => `• ${r.name} — ${r.segmentCount.toLocaleString()} segments`),
        '',
        'Profiles this size usually come from a fixed-cadence resource in the mission model, where segment count grows with simulation duration rather than with the number of value changes.',
      ].join('\n')
    : '';
</script>

{#if hasError}
  <div
    class="ml-2 inline-flex items-center gap-1 text-destructive"
    use:tooltip={{ content: errorTooltip, placement: 'bottom' }}
    role="status"
    aria-label="Timeline data error"
  >
    <TriangleAlert size={14} />
    <span class="text-xs font-medium">{errorCount}</span>
  </div>
{:else if $loading}
  <div
    class="ml-2 inline-flex items-center text-muted-foreground"
    use:tooltip={{ content: 'Loading timeline data…', placement: 'bottom' }}
    role="status"
    aria-label="Timeline loading"
  >
    <LoaderCircle size={14} class="animate-spin" />
  </div>
{/if}

{#if hasOversized}
  <div
    class="ml-2 inline-flex items-center gap-1 text-muted-foreground"
    use:tooltip={{ content: oversizedTooltip, placement: 'bottom' }}
    role="status"
    aria-label="Large profile warning"
  >
    <ChartSpline size={14} />
    <span class="text-xs font-medium">{oversizedCount}</span>
  </div>
{/if}
