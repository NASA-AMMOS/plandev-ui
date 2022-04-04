<script lang="ts">
  export let padding: string = '0';
  export let columns: string = 'none';
  export let gap: string = '0';
  export let rows: string = 'none';
</script>

<div style="gap: {gap}; grid-template-columns: {columns}; grid-template-rows: {rows}; padding: {padding}">
  <slot />
</div>

<style>
  div {
    display: grid;
    overflow: hidden;
  }
</style>
