<!--
  @component Tooltip

  A wrapper component for tooltips using the Stellar design system.

  **When to use this component vs Stellar's primitive Tooltip:**

  - Use this wrapper component (`<Tooltip>`) for:
    - Simple single-element triggers (buttons, icons)
    - When you need keyboard shortcut display
    - Quick, consistent tooltip behavior with sensible defaults

  - Use Stellar's primitive Tooltip components (`Tooltip.Root`, `Tooltip.Trigger`, etc.) for:
    - Complex trigger situations (multiple elements, custom positioning)
    - When you need fine-grained control over open/close behavior
    - When the trigger can't be wrapped in a span (asChild pattern needed)
    - When you need to compose with other Stellar components

  Example usage:
  ```svelte
  <Tooltip content="Save file" shortcut="⌘S">
    <Button>Save</Button>
  </Tooltip>
  ```
-->
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
    wrapperClass?: string;
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
  export let openDelay: number = 300;
  /** Delay in ms before hiding tooltip */
  export let closeDelay: number = 200;
  /** Class to add to wrapping span element */
  export let wrapperClass: string = '';

  let className: string = '';
  export { className as class };

  let open = false;
  let openTimeout: ReturnType<typeof setTimeout>;
  let closeTimeout: ReturnType<typeof setTimeout>;

  function handleFocusIn(event: FocusEvent) {
    // Only open tooltip for keyboard focus, not mouse click focus
    const target = event.target as HTMLElement | null;
    if (target?.matches(':focus-visible')) {
      clearTimeout(closeTimeout);
      openTimeout = setTimeout(() => (open = true), openDelay);
    }
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
        class={cn(
          'inline-flex has-[[aria-disabled=true]]:pointer-events-none has-[[disabled]]:pointer-events-none',
          wrapperClass,
        )}
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
