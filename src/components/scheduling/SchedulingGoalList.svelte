<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import SchedulingGoal from './SchedulingGoal.svelte';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import {
    schedulingActions,
    schedulingSpecGoals,
    selectedSpecId,
  } from '../../stores/scheduling';

  onMount(() => {
    schedulingSpecGoals.setVariables({ specification_id: $selectedSpecId });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Scheduling Goals</Chip>
    <button
      class="st-button ellipsis"
      on:click={() => schedulingActions.runScheduling()}
    >
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
        on:click={() => schedulingActions.openGoalEditor()}
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
