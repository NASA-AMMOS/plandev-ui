<script lang="ts">
  import { cn, Tooltip } from '@nasa-jpl/stellar-svelte';
  import { tv, type VariantProps } from 'tailwind-variants';
  import { useSidebar } from '../context';

  // Tailwind variants definition
  const sidebarMenuButtonVariants = tv({
    base: 'peer/menu-button outline-hidden group-has-data-[sidebar=menu-action]/menu-item:pr-8 grid w-full min-w-0 grid-cols-[auto_auto_1fr] items-center gap-1 overflow-hidden rounded-md p-2 text-left text-sm ring-[var(--sidebar-ring)] transition-[width,height,padding] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] focus-visible:ring-2 active:bg-[var(--sidebar-accent)] active:text-[var(--sidebar-accent-foreground)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-[var(--sidebar-accent)] data-[active=true]:font-medium data-[active=true]:text-[var(--sidebar-accent-foreground)] data-[state=open]:hover:bg-[var(--sidebar-accent)] data-[state=open]:hover:text-[var(--sidebar-accent-foreground)] group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
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
  export let ref: HTMLButtonElement | null = null;
  export let className: string = '';
  export let isActive: boolean = false;
  export let size: SidebarMenuButtonSize = 'default';
  export let tooltipContent: string = '';
  export let variant: SidebarMenuButtonVariant = 'default';

  const sidebar = useSidebar();

  let sidebarState: 'expanded' | 'collapsed' = 'expanded';

  // Subscribe to sidebar state
  $: if (sidebar) {
    sidebar.state.subscribe(value => {
      sidebarState = value;
    });
  }

  $: buttonClass = cn(sidebarMenuButtonVariants({ size, variant }), className);
  $: showTooltip = tooltipContent && sidebarState === 'collapsed';
</script>

{#if showTooltip}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <button
        bind:this={ref}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        class={buttonClass}
        on:click
        on:contextmenu
      >
        <slot />
      </button>
    </Tooltip.Trigger>
    <Tooltip.Content side="right" align="center">
      {tooltipContent}
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <button
    bind:this={ref}
    data-slot="sidebar-menu-button"
    data-sidebar="menu-button"
    data-size={size}
    data-active={isActive}
    class={buttonClass}
    on:click
    on:contextmenu
  >
    <slot />
  </button>
{/if}
