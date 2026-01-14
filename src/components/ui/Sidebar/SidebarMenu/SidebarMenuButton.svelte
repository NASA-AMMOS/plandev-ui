<script lang="ts">
  import { Button, cn, Tooltip } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { tv, type VariantProps } from 'tailwind-variants';

  const dispatch = createEventDispatcher<{
    click: { event: MouseEvent; wasActive: boolean };
  }>();

  // Tailwind variants definition
  const sidebarMenuButtonVariants = tv({
    base: 'peer/menu-button outline-hidden group-has-data-[sidebar=menu-action]/menu-item:pr-8 grid w-full min-w-0 grid-cols-[auto_auto_1fr] items-center gap-1 overflow-hidden rounded-md p-2 text-left text-sm ring-inset transition-[width,height,padding] focus-visible:ring-2 focus-visible:ring-ring active:bg-background  active:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=active]:border data-[active=true]:bg-background data-[active=true]:font-medium data-[active=true]:text-[var(--sidebar-accent-foreground)] data-[active=true]:shadow-[inset_0_-1px_0_0_var(--sidebar-border)] data-[active=false]:hover:bg-[var(--sidebar-accent)] data-[active=false]:hover:text-[var(--sidebar-accent-foreground)] data-[state=open]:hover:text-[var(--sidebar-accent-foreground)] group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-8 text-sm',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0',
        sm: 'h-7 text-xs',
      },
      variant: {
        default: 'hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
        outline:
          'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
      },
    },
  });

  // Type definitions
  type SidebarMenuButtonVariant = VariantProps<typeof sidebarMenuButtonVariants>['variant'];
  type SidebarMenuButtonSize = VariantProps<typeof sidebarMenuButtonVariants>['size'];

  // Props
  export let ref: Button | null = null;
  export let className: string = '';
  export let isActive: boolean = false;
  export let size: SidebarMenuButtonSize = 'default';
  export let tooltipContent: string = '';
  export let variant: SidebarMenuButtonVariant = 'default';

  $: buttonClass = cn(sidebarMenuButtonVariants({ size, variant }), className);
  $: showTooltip = !!tooltipContent;

  function handleClick(event: MouseEvent) {
    dispatch('click', { event, wasActive: isActive });
  }
</script>

{#if showTooltip}
  <Tooltip.Root>
    <Tooltip.Trigger asChild let:builder>
      <Button
        builders={[builder]}
        variant="ghost"
        bind:this={ref}
        aria-label={tooltipContent}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        class={cn(buttonClass, className)}
        on:click={handleClick}
      >
        <slot />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content>
      {tooltipContent}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <Button
    variant="ghost"
    bind:this={ref}
    data-slot="sidebar-menu-button"
    data-sidebar="menu-button"
    data-size={size}
    data-active={isActive}
    class={buttonClass}
    on:click={handleClick}
  >
    <slot />
  </Button>
{/if}
