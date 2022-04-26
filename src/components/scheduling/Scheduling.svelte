<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import SchedulingGoal from './SchedulingGoal.svelte';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import Panel from '../ui/Panel.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import { schedulingActions, schedulingSpecGoals, schedulingStatus, selectedSpecId } from '../../stores/scheduling';

  onMount(() => {
    schedulingSpecGoals.setVariables({ specification_id: $selectedSpecId });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Scheduling</Chip>
    <StatusBadge status={$schedulingStatus} title="Schedule" on:click={() => schedulingActions.runScheduling()} />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Input>
      <i class="bi bi-search" slot="left" />
      <input class="st-input w-100" name="search" placeholder="Find scheduling goals" />
    </Input>
    {#if !$schedulingSpecGoals.length}
      <div class="pt-1">No scheduling goals found</div>
    {:else}
      {#each $schedulingSpecGoals as specGoal}
        <SchedulingGoal goal={specGoal.goal} priority={specGoal.priority} />
      {/each}
    {/if}
  </svelte:fragment>
</Panel>
