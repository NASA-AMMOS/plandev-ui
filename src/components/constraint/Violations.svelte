<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ConstraintViolation } from '../../types';
  import Card from '../ui/Card.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  const dispatch = createEventDispatcher();

  export let violations: ConstraintViolation[] = [];

  function clickViolation(violation: ConstraintViolation) {
    const { windows } = violation;
    const [window] = windows;
    dispatch('selectWindow', window);
  }
</script>

<Panel hideFooter>
  <span slot="header"> Constraint Violations </span>
  <span slot="body">
    {#if violations.length}
      {#each violations as violation}
        <ListItem
          class="m-1 p-1"
          style="cursor: pointer"
          on:click={() => clickViolation(violation)}
        >
          {violation.constraint.name}
          <span slot="suffix">
            <i class="bi bi-exclamation-triangle" />
          </span>
        </ListItem>
      {/each}
    {:else}
      <Card class="m-1 p-1">No Violations Found</Card>
    {/if}
  </span>
</Panel>
