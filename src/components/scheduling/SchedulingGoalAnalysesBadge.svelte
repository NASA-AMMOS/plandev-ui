<svelte:options immutable={true} />

<script lang="ts">
  export let analyses: SchedulingGoalAnalysis[] = [];

  let activitiesDifference: number | null = null;
  let currentAnalysis: SchedulingGoalAnalysis | null = null;
  let prevAnalysis: SchedulingGoalAnalysis | null = null;

  $: {
    currentAnalysis = analyses[0] || null;
    prevAnalysis = analyses[1] || null;
    if (currentAnalysis && prevAnalysis) {
      activitiesDifference =
        currentAnalysis.satisfying_activities_aggregate.aggregate.count -
        prevAnalysis.satisfying_activities_aggregate.aggregate.count;
    }
  }
</script>

{#if currentAnalysis}
  <div class="scheduling-goal-analyses-badge">
    {#if activitiesDifference !== null}
      <div
        class="difference-badge"
        class:negative={activitiesDifference < 0}
        class:positive={activitiesDifference > -1}
      >
        {#if activitiesDifference > -1}
          +{activitiesDifference}
        {:else}
          {activitiesDifference}
        {/if}
      </div>
    {/if}
    <div>{currentAnalysis.satisfying_activities_aggregate.aggregate.count}</div>
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
    background-color: var(--st-gray-30);
    border-radius: 4px;
    display: inline-flex;
    justify-content: center;
    padding: 2px;
  }

  .difference-badge.negative {
    background-color: rgba(186, 0, 34, 0.08);
    color: #ba0022;
  }

  .difference-badge.positive {
    background-color: var(--st-primary-20);
    color: var(--st-primary-90);
  }
</style>
