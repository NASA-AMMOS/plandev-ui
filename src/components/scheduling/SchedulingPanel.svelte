<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { plan } from '../../stores/plan';
  import { schedulingSpecGoals, schedulingStatus, selectedSpecId } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import SchedulingGoal from './SchedulingGoal.svelte';

  export let gridId: number;

  let filterText: string = '';
  let filteredSchedulingSpecGoals: SchedulingSpecGoal[] = [];

  $: filteredSchedulingSpecGoals = $schedulingSpecGoals.filter(spec => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = spec.goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  onMount(() => {
    schedulingSpecGoals.setVariables({ specification_id: $selectedSpecId });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Scheduling" />
    <PanelHeaderActions status={$schedulingStatus}>
      <PanelHeaderActionButton title="Analyze" icon="bi bi-card-checklist" on:click={() => effects.schedule(true)} />
      <PanelHeaderActionButton title="Schedule" on:click={() => effects.schedule()} />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CssGrid columns="4fr 1fr" gap="5px">
      <input bind:value={filterText} class="st-input w-100" name="search" placeholder="Filter scheduling goals" />
      <button
        class="st-button secondary"
        name="new-scheduling-goal"
        on:click={() =>
          window.open(`${base}/scheduling/goals/new?modelId=${$plan.model.id}&&specId=${$selectedSpecId}`, '_blank')}
      >
        New
      </button>
    </CssGrid>
    {#if !filteredSchedulingSpecGoals.length}
      <div class="pt-1 st-typography-label">No scheduling goals found</div>
    {:else}
      {#each filteredSchedulingSpecGoals as specGoal}
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
