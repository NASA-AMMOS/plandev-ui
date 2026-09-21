<svelte:options immutable={true} />

<script lang="ts">
  import PlayOffIcon from './PlayOffIcon.svelte';

  export let isReadOnly: boolean = false;
  export let name: string;
  export let size: number = 18;
</script>

<div class="grid grid-cols-[max-content_min-content] items-center gap-2">
  <span>{name}</span>
  {#if isReadOnly}
    <PlayOffIcon {size} />
  {/if}
</div>
