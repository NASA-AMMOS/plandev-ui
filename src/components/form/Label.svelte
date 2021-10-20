<svelte:options immutable={true} />

<script lang="ts">
  export { className as class };
  export { forName as for };
  export { styleName as style };
  export let invalid: boolean = false;

  let className: string = '';
  let forName: string = '';
  let styleName: string = '';
</script>

<label class={className} class:error={invalid} for={forName} style={styleName}>
  <slot />
</label>

<style>
  label.error {
    color: var(--st-red);
  }
</style>
