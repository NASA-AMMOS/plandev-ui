<svelte:options immutable={true} />

<script lang="ts">
  import { difference } from 'lodash-es';

  export let analyses: SchedulingGoalAnalysis[] = [];

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
  <div class="scheduling-goal-analyses-badge">
    {#if satisfyingActivitiesDifference !== null}
      <div class="difference-badge">
        +{satisfyingActivitiesDifference}
      </div>
    {/if}
    {currentAnalysis.satisfying_activities.length}
    {#if currentAnalysis.satisfied}
      <i class="bi bi-check-circle-fill" style:color="var(--st-primary-50)" />
    {:else}
      <i class="bi bi-x-circle-fill" style:color="var(--st-red)" />
    {/if}
  </div>
{/if}

<style>
  .scheduling-goal-analyses-badge {
    align-items: center;
    background-color: var(--st-gray-10);
    border-radius: 4px;
    color: var(--st-gray-60);
    display: inline-flex;
    font-family: var(--st-typography-font-family);
    font-size: var(--st-typography-body-font-size);
    font-weight: var(--st-typography-bold-font-weight);
    gap: 8px;
    justify-content: space-evenly;
    line-height: var(--st-typography-body-line-height);
    letter-spacing: var(--st-typography-body-letter-spacing);
    padding: 2px 5px;
  }

  .bi {
    font-size: 1rem;
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
</style>
