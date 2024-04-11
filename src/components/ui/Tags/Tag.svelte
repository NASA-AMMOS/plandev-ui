<svelte:options immutable={true} />

<script lang="ts">
  import type { Tag } from '../../../types/tags';
  import Chip from '../Chip.svelte';

  export let disabled: boolean = false;
  export let removable: boolean = true;
  export let ariaRole: string = '';
  export let tag: Partial<Tag>;
</script>

<Chip
  {ariaRole}
  {disabled}
  color={tag.color}
  className="tag st-typography-medium"
  label={tag.name}
  {removable}
  on:click
>
  <slot />
</Chip>

<style>
  :global(.tag.st-chip) {
    border-radius: 16px !important;
    display: flex !important;
    height: 20px !important;
    padding: 2px 8px !important;
    user-select: none;
  }

  :global(.tag.st-chip .chip-label) {
    line-height: 16px;
  }

  :global(.tag.st-chip .chip-remove-button) {
    height: 100%;
    width: 20px;
  }
</style>
