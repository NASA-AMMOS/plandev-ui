<svelte:options accessors={true} />

<script lang="ts">
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';
  import { selectedConstraint } from '../../stores/constraints';
  import { constraintEditorPanel, constraintsPanel, constraintViolationsPanel } from '../../stores/panels';

  export let constraintMenu: Menu;
</script>

<Menu right="0px" top="30px" bind:this={constraintMenu}>
  <MenuItem on:click={() => constraintsPanel.show()}>
    <i class="bi bi-list" />
    Constraints
  </MenuItem>
  <MenuItem
    on:click={() => {
      $selectedConstraint = null;
      constraintEditorPanel.show();
    }}
  >
    <i class="bi bi-plus-circle" />
    Create Constraint
  </MenuItem>
  <MenuItem on:click={() => constraintViolationsPanel.show()}>
    <i class="bi bi-exclamation-triangle" />
    Violations
  </MenuItem>
</Menu>
