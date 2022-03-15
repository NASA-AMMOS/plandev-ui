<svelte:options immutable={true} />

<script lang="ts">
  import { keyBy } from 'lodash-es';
  import { onMount } from 'svelte';
  import SchedulingGoal from './SchedulingGoal.svelte';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import { activitiesMap, selectedActivityId } from '../../stores/activities';
  import { schedulingPanelEditor } from '../../stores/panels';
  import { plan } from '../../stores/plan';
  import {
    schedulingSpecGoals,
    schedulingStatus,
  } from '../../stores/scheduling';
  import { simulationStatus } from '../../stores/simulation';
  import { Status } from '../../utilities/enums';
  import req from '../../utilities/requests';

  $: specification_id = $plan.scheduling_specifications[0].id;

  onMount(() => {
    schedulingSpecGoals.setVariables({ specification_id });
  });

  async function runScheduling() {
    const { id: planId } = $plan;
    const plan_revision = await req.getPlanRevision(planId);
    await req.updateSchedulingSpec(specification_id, { plan_revision });

    $schedulingStatus = Status.Executing;
    const { reason, status } = await req.schedule(specification_id);

    if (status === 'complete') {
      const newActivities = await req.getActivitiesForPlan(planId);
      $activitiesMap = keyBy(newActivities, 'id');
      $selectedActivityId = null;

      simulationStatus.update(Status.Dirty);
      $schedulingStatus = Status.Complete;
    } else if (status === 'failed') {
      $schedulingStatus = Status.Failed;
      console.log(reason);
    } else if (status === 'incomplete') {
      $schedulingStatus = Status.Incomplete;
      console.log(reason);
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Scheduling Goals</Chip>
    <button class="st-button ellipsis" on:click={runScheduling}>
      Schedule & Analyze
    </button>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CssGrid gap="3px" columns="auto 80px">
      <Input>
        <i class="bi bi-search" slot="left" />
        <input
          class="st-input w-100"
          name="search"
          placeholder="Find scheduling goals"
        />
      </Input>
      <button
        class="st-button secondary"
        on:click={() => ($schedulingPanelEditor = true)}
      >
        New Goal
      </button>
    </CssGrid>
    {#if !$schedulingSpecGoals.length}
      <div class="pt-1">No scheduling goals found</div>
    {:else}
      {#each $schedulingSpecGoals as specGoal}
        <SchedulingGoal goal={specGoal.goal} priority={specGoal.priority} />
      {/each}
    {/if}
  </svelte:fragment>
</Panel>
