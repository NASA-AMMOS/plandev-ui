<svelte:options immutable={true} />

<script lang="ts">
  import PlayOffIcon from './PlayOffIcon.svelte';

  export let isReadOnly: boolean = false;
  export let name: string;
  export let size: number = 18;
</script>

{#if isReadOnly}
  <div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
    <span class="overflow-hidden text-ellipsis">{name}</span>
    <PlayOffIcon {size} />
  </div>
{:else}
  <div class="grid w-full grid-cols-1 items-center gap-2">
    <span class="overflow-hidden text-ellipsis">{name}</span>
  </div>
{/if}
