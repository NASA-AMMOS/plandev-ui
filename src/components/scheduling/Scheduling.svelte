<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte';
  import { schedulingSpecGoals, schedulingStatus, selectedSpecId } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import Input from '../form/Input.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import SchedulingGoal from './SchedulingGoal.svelte';

  export let gridId: number;

  onMount(() => {
    schedulingSpecGoals.setVariables({ specification_id: $selectedSpecId });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Scheduling" />
    <StatusBadge status={$schedulingStatus} title="Schedule" on:click={() => effects.schedule()} />
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
        <SchedulingGoal
          enabled={specGoal.enabled}
          goal={specGoal.goal}
          priority={specGoal.priority}
          specificationId={specGoal.specification_id}
        />
      {/each}
    {/if}
  </svelte:fragment>
</Panel>
