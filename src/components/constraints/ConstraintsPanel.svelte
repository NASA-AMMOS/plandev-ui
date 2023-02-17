<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { checkConstraintsStatus, constraints } from '../../stores/constraints';
  import type { Constraint } from '../../types/constraint';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import ConstraintListItem from './ConstraintListItem.svelte';

  export let gridSection: ViewGridSection;

  let filterText: string = '';
  let filteredConstraints: Constraint[] = [];

  $: filteredConstraints = $constraints.filter(constraint => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = constraint.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Constraints" />
    <PanelHeaderActions status={$checkConstraintsStatus}>
      <PanelHeaderActionButton title="Check Constraints" showLabel on:click={() => effects.checkConstraints()} />
    </PanelHeaderActions>
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
      <div class="pt-1 st-typography-label">No Constraints Found</div>
    {:else}
      <div class="pt-2">
        {#each filteredConstraints as constraint}
          <ConstraintListItem {constraint} />
        {/each}
      </div>
    {/if}
  </svelte:fragment>
</Panel>
