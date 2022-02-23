<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Chip from '../ui/Chip.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  export let violations: ConstraintViolation[] = [];

  const dispatch = createEventDispatcher();

  function clickViolation(violation: ConstraintViolation) {
    const { windows } = violation;
    const [window] = windows;
    dispatch('selectWindow', window);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <Chip>Constraint Violations</Chip>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if violations.length}
      {#each violations as violation}
        <ListItem
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
      No Violations Found
    {/if}
  </svelte:fragment>
</Panel>
