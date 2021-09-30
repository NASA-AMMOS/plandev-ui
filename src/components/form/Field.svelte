<svelte:options immutable={true} />

<script lang="ts">
  export { className as class };
  export let visible: boolean = true;

  let className: string = '';
</script>

{#if visible}
  <fieldset class={className}>
    <slot />
  </fieldset>
{/if}

<style>
  fieldset {
    border: 0;
    margin: 0;
  }
</style>
