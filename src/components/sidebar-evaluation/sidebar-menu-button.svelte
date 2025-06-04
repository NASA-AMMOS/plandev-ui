<script lang="ts">
  import { Tooltip } from '@nasa-jpl/stellar-svelte';
  import { tv, type VariantProps } from 'tailwind-variants';
  import { cn } from '../../utilities/generic';
  import { useSidebar } from './context';

  // Tailwind variants definition
  const sidebarMenuButtonVariants = tv({
    base: 'peer/menu-button outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-8 text-sm',
        lg: 'group-data-[collapsible=icon]:p-0! h-12 text-sm',
        sm: 'h-7 text-xs',
      },
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
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
  >
    <slot />
  </button>
{/if}
