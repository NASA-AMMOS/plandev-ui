<svelte:options immutable={true} />

<script lang="ts">
  import { violations } from '../../stores/constraints';
  import { viewTimeRange } from '../../stores/plan';
  import GridMenu from '../menus/GridMenu.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  function zoomToViolation(violation: ConstraintViolation): void {
    const { windows } = violation;
    const [window] = windows;
    $viewTimeRange = window;
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Constraint Violations" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if $violations.length}
      {#each $violations as violation}
        <ListItem style="cursor: pointer" on:click={() => zoomToViolation(violation)}>
          {violation.constraint.name}
          <span slot="suffix">
            <i class="bi bi-exclamation-triangle" />
          </span>
        </ListItem>
      {/each}
    {:else}
      No Violations Found
    {/if}
  </svelte:fragment>
</Panel>
