<script lang="ts">
  import { cn, Tooltip } from '@nasa-jpl/stellar-svelte';
  import type { TooltipContentProps, TooltipProps } from 'bits-ui';

  interface $$Props extends TooltipContentProps {
    class?: string;
    closeDelay?: number;
    content: string;
    disabled?: boolean;
    group?: TooltipProps['group'];
    openDelay?: number;
    shortcut?: string;
  }

  /** The tooltip content text */
  export let content: string;
  /** Whether the tooltip is disabled */
  export let disabled: boolean = false;
  /** Group identifier - tooltips in the same group coordinate dismissal */
  export let group: $$Props['group'] = 'default';
  /** Keyboard shortcut to show in the tooltip */
  export let shortcut: string = '';
  /** Delay in ms before showing tooltip */
  export let openDelay: number = 700;
  /** Delay in ms before hiding tooltip */
  export let closeDelay: number = 300;

  let className: string = '';
  export { className as class };

  let open = false;
  let openTimeout: ReturnType<typeof setTimeout>;
  let closeTimeout: ReturnType<typeof setTimeout>;

  function handleFocusIn() {
    clearTimeout(closeTimeout);
    openTimeout = setTimeout(() => (open = true), openDelay);
  }

  function handleFocusOut() {
    clearTimeout(openTimeout);
    closeTimeout = setTimeout(() => (open = false), closeDelay);
  }
</script>

{#if disabled}
  <slot />
{:else}
  <Tooltip.Root {group} {openDelay} {closeDelay} bind:open>
    <Tooltip.Trigger asChild let:builder>
      <span
        class="tooltip-trigger"
        {...builder}
        use:builder.action
        on:focusin={handleFocusIn}
        on:focusout={handleFocusOut}
      >
        <slot />
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content {...$$restProps} class={cn('dark', className)}>
      <Tooltip.Arrow />
      <span class="max-w-96 whitespace-nowrap text-xs">
        {content}
        {#if shortcut}
          &nbsp;<kbd
            class="rounded border bg-gray-200 px-1 font-sans font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          >
            {shortcut}
          </kbd>
        {/if}
      </span>
    </Tooltip.Content>
  </Tooltip.Root>
{/if}

<style>
  .tooltip-trigger {
    display: inline-flex;
  }

  /* Disable tooltip interaction when child element is disabled */
  .tooltip-trigger:has([disabled], [aria-disabled='true']) {
    pointer-events: none;
  }
</style>
