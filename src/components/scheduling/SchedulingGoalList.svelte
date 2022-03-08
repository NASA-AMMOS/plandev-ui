<svelte:options immutable={true} />

<script lang="ts">
  import { keyBy } from 'lodash-es';
  import SchedulingGoal from './SchedulingGoal.svelte';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import Panel from '../ui/Panel.svelte';
  import { activitiesMap, selectedActivityId } from '../../stores/activities';
  import { plan } from '../../stores/plan';
  import {
    schedulingSpecGoals,
    schedulingStatus,
  } from '../../stores/scheduling';
  import { simulationStatus } from '../../stores/simulation';
  import { ExecutionStatus } from '../../utilities/enums';
  import req from '../../utilities/requests';
  import { onMount } from 'svelte';

  onMount(() => {
    const specification_id = $plan.scheduling_specifications[0].id;
    schedulingSpecGoals.setVariables({ specification_id });
  });

  async function runScheduling() {
    $schedulingStatus = ExecutionStatus.Executing;
    const { id: planId } = $plan;
    const response = await req.schedule(planId);

    if (response.status === 'complete') {
      const newActivities = await req.getActivitiesForPlan(planId);
      simulationStatus.update(ExecutionStatus.Dirty);
      $activitiesMap = keyBy(newActivities, 'id');
      $schedulingStatus = ExecutionStatus.Complete;
      $selectedActivityId = null;
    } else {
      if (response.status === 'failed') {
        $schedulingStatus = ExecutionStatus.Failed;
      } else {
        $schedulingStatus = ExecutionStatus.Unknown;
      }
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Scheduling Goals</Chip>
    <button class="st-button ellipsis" on:click={runScheduling}>
      Schedule
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Input>
      <i class="bi bi-search" slot="left" />
      <input
        class="st-input w-100"
        name="search"
        placeholder="Find scheduling goals"
      />
    </Input>
    {#if !$schedulingSpecGoals.length}
      <div class="pt-1">No scheduling goals found</div>
    {:else}
      {#each $schedulingSpecGoals as spec}
        <SchedulingGoal {spec} />
      {/each}
    {/if}
  </svelte:fragment>
</Panel>
