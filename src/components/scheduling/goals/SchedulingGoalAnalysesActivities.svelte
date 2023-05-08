<svelte:options immutable={true} />

<script lang="ts">
  import { activityDirectivesMap, selectedActivityDirectiveId } from '../../../stores/activities';
  import type { ActivityDirective } from '../../../types/activity';
  import type { SchedulingGoalAnalysis } from '../../../types/scheduling';
  import { sortActivityDirectivesOrSpans } from '../../../utilities/activities';
  import Collapse from '../../Collapse.svelte';

  export let analyses: SchedulingGoalAnalysis[] = [];

  let analysis: SchedulingGoalAnalysis | null = null;
  let satisfyingActivities: ActivityDirective[] = [];

  $: analysis = analyses[0] || null;
  $: satisfyingActivities = analysis
    ? analysis.satisfying_activities.reduce((satisfyingActivities: ActivityDirective[], { activity_id }) => {
        const activityDirective = $activityDirectivesMap[activity_id];
        if (activityDirective) {
          satisfyingActivities.push(activityDirective);
        }
        return satisfyingActivities;
      }, [])
    : [];
  $: sortedSatisfyingActivities = satisfyingActivities.sort(sortActivityDirectivesOrSpans);
</script>

<Collapse title="Activities" className="scheduling-goal-analysis-activities">
  {#if analysis && sortedSatisfyingActivities.length}
    <div class="scheduling-goal-analysis-activities-list">
      {#each sortedSatisfyingActivities as activityDirective}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <button
          class="st-button tertiary satisfied-activity"
          class:selected={$selectedActivityDirectiveId === activityDirective.id}
          on:click={() => ($selectedActivityDirectiveId = activityDirective.id)}
        >
          {activityDirective.name}
        </button>
      {/each}
    </div>
  {:else}
    <li class="st-typography-label">No Satisfied Activities</li>
  {/if}
</Collapse>

<style>
  .scheduling-goal-analysis-activities-list {
    display: flex;
    flex-direction: column;
  }

  li {
    list-style: none;
  }

  .satisfied-activity {
    cursor: pointer;
    justify-content: flex-start;
    padding: 8px 8px;
    text-align: left;
    user-select: auto;
  }

  .satisfied-activity.selected,
  .satisfied-activity.selected:hover {
    background: #e1f5fe;
    border-radius: 4px;
  }
</style>
