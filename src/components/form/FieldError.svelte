<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export let field: FieldStore<any>;
</script>

{#if $field.invalid}
  <div
    class="error"
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

  .error > div {
    color: var(--st-red);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
