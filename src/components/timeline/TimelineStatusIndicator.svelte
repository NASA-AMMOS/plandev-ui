<svelte:options immutable={true} />

<script lang="ts">
  import { LoaderCircle, TriangleAlert } from 'lucide-svelte';
  import { derived, type Readable } from 'svelte/store';
  import { activityDirectivesDB } from '../../stores/activities';
  import { constraintRuns } from '../../stores/constraints';
  import { selectedExternalEventsRaw } from '../../stores/external-event';
  import { profilesErroring, profilesLoading } from '../../stores/profile';
  import { fetchingResourcesExternal, initialSpansLoading } from '../../stores/simulation';
  import { tooltip } from '../../utilities/tooltip';

  type StatusError = { message: string; source: string };

  // Aggregate loading/error from every timeline data source. Inline rather than
  // a dedicated store — only consumer is this indicator.
  const loading: Readable<boolean> = derived(
    [
      profilesLoading,
      fetchingResourcesExternal,
      initialSpansLoading,
      activityDirectivesDB.loading,
      constraintRuns.loading,
      selectedExternalEventsRaw.loading,
    ],
    values => values.some(Boolean),
  );

  const errors: Readable<StatusError[]> = derived(
    [profilesErroring, activityDirectivesDB.error, constraintRuns.error, selectedExternalEventsRaw.error],
    ([profileErrs, directivesErr, constraintsErr, eventsErr]) => {
      const out: StatusError[] = [];
      profileErrs.forEach(e => out.push({ message: e.error, source: `Profile ${e.name}` }));
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
