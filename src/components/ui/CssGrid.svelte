<script lang="ts">
  export { className as class };
  export let padding: string = '0';
  export let columns: string = 'none';
  export let gap: string = '0';
  export let rows: string = 'none';

  let className: string = '';
</script>

<div
  class={className}
  style="gap: {gap}; grid-template-columns: {columns}; grid-template-rows: {rows}; padding: {padding}"
>
  <slot />
</div>

<style>
  div {
    display: grid;
  }
</style>
