<script lang="ts">
  import type { Status } from '../../enums/status';
  import StatusBadge from './StatusBadge.svelte';

  export let status: Status | null = null;
  export let indeterminate: boolean = false;
</script>

<span class="header-actions">
  {#if status}
    <StatusBadge {status} {indeterminate} />
  {/if}
  <slot />
</span>

<style>
  .header-actions {
    align-items: center;
    display: inline-flex;
    font-size: 11px;
    font-weight: 500;
    justify-content: center;
    letter-spacing: 0.025em;
    line-height: 1;
    white-space: nowrap;
  }
</style>
