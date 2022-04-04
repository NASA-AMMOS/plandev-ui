<svelte:options accessors={true} />

<script lang="ts">
  import Menu from './Menu.svelte';
  import MenuItem from './MenuItem.svelte';
  import { selectedConstraint } from '../../stores/constraints';
  import { constraintEditorPanel, constraintListPanel, constraintViolationsPanel } from '../../stores/panels';

  export let constraintMenu: Menu;
</script>

<Menu bind:this={constraintMenu}>
  <MenuItem
    on:click={() => {
      $selectedConstraint = null;
      constraintEditorPanel.show();
    }}
  >
    <i class="bi bi-plus-circle" />
    Create Constraint
  </MenuItem>
  <MenuItem on:click={() => constraintListPanel.show()}>
    <i class="bi bi-list" />
    Constraint List
  </MenuItem>
  <MenuItem on:click={() => constraintViolationsPanel.show()}>
    <i class="bi bi-exclamation-triangle" />
    Violations
  </MenuItem>
</Menu>
