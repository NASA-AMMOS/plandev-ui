<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import ChecklistIcon from '@nasa-jpl/stellar/icons/checklist.svg?component';
  import { afterUpdate, beforeUpdate } from 'svelte';
  import { plan } from '../../stores/plan';
  import { schedulingSpecGoals, schedulingStatus, selectedSpecId } from '../../stores/scheduling';
  import effects from '../../utilities/effects';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import SchedulingGoal from './goals/SchedulingGoal.svelte';

  export let gridId: number;

  let activeElement: HTMLElement;
  let filterText: string = '';
  let filteredSchedulingSpecGoals: SchedulingSpecGoal[] = [];

  $: filteredSchedulingSpecGoals = $schedulingSpecGoals.filter(spec => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = spec.goal.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  // Manually keep focus as scheduling goal elements are re-ordered.
  // Svelte currently does not retain focus as elements are moved, even when keyed.
  // See discussion here: https://github.com/sveltejs/svelte/issues/3973
  beforeUpdate(() => {
    activeElement = document.activeElement as HTMLElement;
  });

  afterUpdate(() => {
    if (activeElement) {
      activeElement.focus();
    }
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Scheduling Goals" />
    <PanelHeaderActions status={$schedulingStatus}>
      <PanelHeaderActionButton title="Analyze" on:click={() => effects.schedule(true)}>
        <ChecklistIcon />
      </PanelHeaderActionButton>
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
      {#each filteredSchedulingSpecGoals as specGoal (specGoal.goal.id)}
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
