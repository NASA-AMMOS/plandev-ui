<svelte:options immutable={true} />

<script lang="ts">
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { derived, type Readable } from 'svelte/store';
  import { Status } from '../../enums/status';
  import { activityDirectivesDB } from '../../stores/activities';
  import { constraintRuns } from '../../stores/constraints';
  import { selectedExternalEventsRaw } from '../../stores/external-event';
  import { initialSpansLoading, simulationStatus } from '../../stores/simulation';
  import { timelineResourcesErroring, timelineResourcesLoading } from '../../stores/timelineResourceStatus';
  import { tooltip } from '../../utilities/tooltip';

  type StatusError = { message: string; source: string };

  // Profile subs flip out of `loading` on first batch; without this the
  // indicator would hide mid-sim while data is still streaming.
  const simulationStreaming: Readable<boolean> = derived(
    simulationStatus,
    $simulationStatus => $simulationStatus === Status.Pending || $simulationStatus === Status.Incomplete,
  );

  const loading: Readable<boolean> = derived(
    [
      timelineResourcesLoading,
      initialSpansLoading,
      activityDirectivesDB.loading,
      constraintRuns.loading,
      selectedExternalEventsRaw.loading,
      simulationStreaming,
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
