<svelte:options immutable={true} />

<script lang="ts">
  export { className as class };

  let className: string = '';
</script>

<div class:tab-list={true} class={className}>
  <slot />
</div>

<style>
  .tab-list {
    background-color: var(--tab-list-background-color, var(--st-primary-inverse-background-color));
    display: flex;
    flex-flow: row;
    gap: var(--tab-list-gap, 0);
  }
</style>
