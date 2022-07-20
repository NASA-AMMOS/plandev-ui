<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { checkConstraintsStatus, constraints } from '../../stores/constraints';
  import { plan } from '../../stores/plan';
  import effects from '../../utilities/effects';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';
  import ConstraintListItem from './ConstraintListItem.svelte';

  export let gridId: number;

  let filterText: string = '';
  let filteredConstraints: Constraint[] = [];

  $: filteredConstraints = $constraints.filter(constraint => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  onMount(() => {
    constraints.setVariables({ modelId: $plan.model.id, planId: $plan.id });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Constraints" />
    <StatusBadge
      status={$checkConstraintsStatus}
      title="Check Constraints"
      titleWidth="135px"
      on:click={() => effects.checkConstraints()}
    />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <CssGrid columns="4fr 1fr" gap="5px">
      <input bind:value={filterText} class="st-input w-100" name="search" placeholder="Filter constraints" />
      <button
        class="st-button secondary"
        name="new-constraint"
        on:click={() => window.open(`${base}/constraints/new`, '_blank')}
      >
        New
      </button>
    </CssGrid>
    {#if !filteredConstraints.length}
      <div class="pt-1">No constraints found</div>
    {:else}
      <div class="pt-2">
        {#each filteredConstraints as constraint}
          <ConstraintListItem {constraint} />
        {/each}
      </div>
    {/if}
  </svelte:fragment>
</Panel>
