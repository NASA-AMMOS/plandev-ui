<svelte:options immutable={true} />

<script lang="ts">
  /**
   * PermissionGuard - A higher-order component for permission-based input control.
   *
   * Instead of using the permissionHandler action, this component wraps form inputs
   * and provides readonly/disabled state via slot props.
   *
   * Usage:
   * ```svelte
   * <PermissionGuard hasPermission={canEdit} permissionError="You don't have edit permission">
   *   <svelte:fragment slot="default" let:readonly let:readonlyTooltip>
   *     <TextInput {readonly} {readonlyTooltip} value={name} />
   *   </svelte:fragment>
   * </PermissionGuard>
   * ```
   *
   * Or with shorthand:
   * ```svelte
   * <PermissionGuard {hasPermission} {permissionError} let:readonly let:readonlyTooltip>
   *   <TextInput {readonly} {readonlyTooltip} bind:value />
   * </PermissionGuard>
   * ```
   */

  import { Tooltip } from '@nasa-jpl/stellar-svelte';

  export let hasPermission: boolean = true;
  export let permissionError: string = '';

  // Computed values passed to slot
  $: readonly = !hasPermission;
  $: readonlyTooltip = readonly ? permissionError : '';

  // Optional: show tooltip on wrapper when permission is denied
  export let showTooltipOnWrapper: boolean = false;

  $: showTooltip = showTooltipOnWrapper && readonly && permissionError;
</script>

{#if showTooltip}
  <Tooltip.Root openDelay={500} closeDelay={50}>
    <Tooltip.Trigger asChild let:builder>
      <div {...builder} use:builder.action class="permission-guard" class:permission-denied={readonly}>
        <slot {readonly} {readonlyTooltip} {hasPermission} {permissionError} />
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <span class="text-xs">{permissionError}</span>
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <div class="permission-guard" class:permission-denied={readonly}>
    <slot {readonly} {readonlyTooltip} {hasPermission} {permissionError} />
  </div>
{/if}

<style>
  .permission-guard {
    display: contents;
  }
</style>
