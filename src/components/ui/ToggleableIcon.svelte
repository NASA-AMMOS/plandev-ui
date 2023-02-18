<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  export let isOn: boolean = true;
</script>

{#if isOn}
  <slot />
{:else}
  <slot name="offIcon" />
{/if}
