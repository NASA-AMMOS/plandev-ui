<svelte:options immutable={true} />

<script lang="ts">
  import SchedulingGoalAnalysesActivities from './SchedulingGoalAnalysesActivities.svelte';
  import SchedulingGoalAnalysesBadge from './SchedulingGoalAnalysesBadge.svelte';
  import Input from '../form/Input.svelte';

  export let goal: SchedulingGoal;
  export let priority: number;

  let expanded = false;
</script>

<div class="scheduling-goal">
  <div class="left">
    <i
      class={expanded ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill'}
      on:click={() => (expanded = !expanded)}
    />
    <i class="bi-calendar-range" />
    {goal.name}
  </div>
  <div class="right">
    <SchedulingGoalAnalysesBadge analyses={goal.analyses} />
    <Input>
      <input class="st-input" style:width="50px" value={priority} />
      <input checked disabled type="checkbox" slot="right" />
    </Input>
  </div>
</div>

{#if expanded}
  <ul>
    <li>
      <SchedulingGoalAnalysesActivities analyses={goal.analyses} />
    </li>
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

  .scheduling-goal {
    align-items: center;
    display: flex;
    font-size: 0.8rem;
    padding-bottom: 5px;
    padding-top: 5px;
  }

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
  }

  .left > i:first-child {
    color: var(--st-gray-40);
    cursor: pointer;
  }

  .right {
    align-items: center;
    display: flex;
    gap: 5px;
    justify-content: flex-end;
  }
</style>
