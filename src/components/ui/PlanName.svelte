<svelte:options immutable={true} />

<script lang="ts">
  import { LockKeyhole } from 'lucide-svelte';

  export let isReadOnly: boolean = false;
  export let name: string;
  export let size: number = 18;
</script>

{#if isReadOnly}
  <div class="grid w-full grid-cols-[min-content_auto] items-center gap-2">
    <LockKeyhole class="opacity-75" {size} />
    <span class="overflow-hidden text-ellipsis">{name}</span>
  </div>
{:else}
  <div class="grid w-full grid-cols-1 items-center gap-2">
    <span class="overflow-hidden text-ellipsis">{name}</span>
  </div>
{/if}
