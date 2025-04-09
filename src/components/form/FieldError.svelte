<script lang="ts">
  import type { FieldStore } from '../../types/form';
  import { classNames } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';

  export let field: FieldStore<any>;
  export let inline: boolean = false;
</script>

{#if $field.invalid}
  <div
    class={classNames('table w-full table-fixed cursor-default pt-1 text-red-500', { 'col-span-full': inline })}
    class:inline
    use:tooltip={{
      content: $field.firstError,
      maxWidth: 'none',
      placement: 'bottom',
      theme: 'error',
    }}
  >
    <div class="overflow-hidden text-ellipsis whitespace-nowrap text-red-500">{$field.firstError}</div>
  </div>
{/if}
