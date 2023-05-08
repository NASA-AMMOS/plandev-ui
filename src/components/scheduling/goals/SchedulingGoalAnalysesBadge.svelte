<svelte:options immutable={true} />

<script lang="ts">
  import CheckCircleFillIcon from 'bootstrap-icons/icons/check-circle-fill.svg?component';
  import XCircleFillIcon from 'bootstrap-icons/icons/x-circle-fill.svg?component';
  import { difference } from 'lodash-es';
  import type { SchedulingGoalAnalysis } from '../../../types/scheduling';
  import { tooltip } from '../../../utilities/tooltip';

  export let analyses: SchedulingGoalAnalysis[] = [];
  export let enabled: boolean;

  let currentAnalysis: SchedulingGoalAnalysis | null = null;
  let previousAnalysis: SchedulingGoalAnalysis | null = null;
  let satisfyingActivitiesDifference: number | null = null;

  $: {
    currentAnalysis = analyses[0] || null;
    previousAnalysis = analyses[1] || null;

    if (currentAnalysis && previousAnalysis) {
      const currentActivityIds = currentAnalysis.satisfying_activities.map(({ activity_id }) => activity_id);
      const previousActivityIds = previousAnalysis.satisfying_activities.map(({ activity_id }) => activity_id);
      satisfyingActivitiesDifference = difference(currentActivityIds, previousActivityIds).length;
    } else if (currentAnalysis) {
      satisfyingActivitiesDifference = currentAnalysis.satisfying_activities.length;
    }
  }
</script>

{#if currentAnalysis}
  <div class="scheduling-goal-analyses-badge st-typography-bold" class:disabled={!enabled}>
    {#if satisfyingActivitiesDifference !== null}
      <div
        class="difference-badge"
        class:disabled={!enabled}
        use:tooltip={{ content: 'New Satisfied Activities', maxWidth: 'none', placement: 'top' }}
      >
        +{satisfyingActivitiesDifference}
      </div>
    {/if}
    <!-- TODO what do these things actually mean? -->
    <div use:tooltip={{ content: 'Total Satisfied Activities', maxWidth: 'none', placement: 'top' }}>
      {currentAnalysis.satisfying_activities.length}
    </div>
    {#if currentAnalysis.satisfied}
      <span
        class="icon satisfied"
        class:disabled={!enabled}
        use:tooltip={{ content: 'Scheduling Goal Satisfied', maxWidth: 'none', placement: 'top' }}
      >
        <CheckCircleFillIcon />
      </span>
    {:else}
      <span
        class="icon unsatisfied"
        class:disabled={!enabled}
        use:tooltip={{ content: 'Scheduling Goal Unsatisfied', maxWidth: 'none', placement: 'top' }}
      >
        <XCircleFillIcon />
      </span>
    {/if}
  </div>
{/if}

<style>
  .scheduling-goal-analyses-badge {
    align-items: center;
    background-color: var(--st-gray-10);
    border-radius: 4px;
    color: var(--st-gray-60);
    cursor: default;
    display: inline-flex;
    gap: 8px;
    justify-content: space-evenly;
    padding: 2px 5px;
  }

  .difference-badge {
    align-items: center;
    background-color: var(--st-primary-20);
    border-radius: 4px;
    color: var(--st-primary-90);
    display: inline-flex;
    justify-content: center;
    padding: 2px;
  }

  .icon {
    display: flex;
  }

  .satisfied {
    color: var(--st-primary-50);
  }

  .unsatisfied {
    color: var(--st-red);
  }
</style>
