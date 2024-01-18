<script lang="ts">
  import type { FieldStore } from '../../types/form';
  import { tooltip } from '../../utilities/tooltip';

  export let field: FieldStore<any>;
  export let inline: boolean = false;
</script>

{#if $field.invalid}
  <div
    class="error"
    class:inline
    use:tooltip={{
      content: $field.firstError,
      maxWidth: 'none',
      placement: 'bottom',
      theme: 'error',
    }}
  >
    <div>{$field.firstError}</div>
  </div>
{/if}

<style>
  .error {
    cursor: default;
    display: table;
    table-layout: fixed;
    width: 100%;
  }

  .error.inline {
    grid-column: 1 / -1;
  }

  .error > div {
    color: var(--st-red);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
