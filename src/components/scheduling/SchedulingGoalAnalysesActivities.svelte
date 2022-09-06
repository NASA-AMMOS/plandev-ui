<svelte:options immutable={true} />

<script lang="ts">
  import ActivityIcon from '@nasa-jpl/stellar/icons/activity.svg?component';
  import ActivityGroupIcon from '@nasa-jpl/stellar/icons/activity_group.svg?component';
  import CaretDownFillIcon from 'bootstrap-icons/icons/caret-down-fill.svg?component';
  import CaretRightFillIcon from 'bootstrap-icons/icons/caret-right-fill.svg?component';
  import { activitiesMap, selectedActivityId } from '../../stores/activities';

  export let analyses: SchedulingGoalAnalysis[] = [];

  let analysis: SchedulingGoalAnalysis | null = null;
  let expanded = true;

  $: {
    analysis = analyses[0] || null;
  }
</script>

<div class="scheduling-goal-analysis-activities">
  <div class="left st-typography-body">
    <span on:click={() => (expanded = !expanded)}>
      {#if !expanded}
        <CaretRightFillIcon />
      {:else}
        <CaretDownFillIcon />
      {/if}
    </span>
    <ActivityGroupIcon />
    Activities
  </div>
</div>

{#if expanded}
  <ul>
    {#if analysis}
      {#if analysis.satisfying_activities.length}
        {#each analysis.satisfying_activities as activity}
          {#if $activitiesMap[activity.activity_id]}
            <li>
              <div
                class="satisfied-activity st-typography-body"
                class:selected={$selectedActivityId === activity.activity_id}
                on:click={() => ($selectedActivityId = activity.activity_id)}
              >
                <ActivityIcon />
                {$activitiesMap[activity.activity_id].type}
              </div>
            </li>
          {/if}
        {/each}
      {:else}
        <li class="st-typography-label">No Satisfied Activities</li>
      {/if}
    {:else}
      <li class="st-typography-label">No Satisfied Activities</li>
    {/if}
  </ul>
{/if}

<style>
  ul {
    margin: 0;
    padding-inline-start: 30px;
  }

  li {
    list-style: none;
  }

  .scheduling-goal-analysis-activities,
  li {
    align-items: center;
    display: flex;
    font-size: 0.8rem;
    padding-bottom: 5px;
    padding-top: 5px;
  }

  .scheduling-goal-analysis-activities .left {
    align-items: center;
    cursor: default;
    display: flex;
    gap: 8px;
  }

  .left > span:first-child {
    color: var(--st-gray-40);
    cursor: pointer;
    display: flex;
  }

  .left :global(.st-icon) {
    width: 16px;
  }

  .satisfied-activity {
    align-items: center;
    cursor: pointer;
    display: inline-flex;
    gap: 5px;
    padding: 5px;
  }

  .selected {
    background: #e1f5fe;
    border-radius: 4px;
  }
</style>
