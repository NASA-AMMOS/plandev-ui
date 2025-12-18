<svelte:options immutable={true} />

<script lang="ts">
  import { Breadcrumb, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import { Ellipsis } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';
  import { PATH_DELIMITER } from '../../../constants/workspaces';

  /** Approximate width in pixels of the breadcrumb separator (chevron + gaps) */
  const SEPARATOR_WIDTH_PX = 22;
  /** Width in pixels of the breadcrumb ellipsis button */
  const ELLIPSIS_WIDTH_PX = 30;
  /** Padding to account for in breadcrumb container measurements */
  const CONTAINER_PADDING_PX = 12;

  /** The root label (e.g., workspace name) - always visible */
  export let rootLabel: string = 'Root';
  /** The current path as a string (segments joined by PATH_DELIMITER) */
  export let currentPath: string = '';
  /** Whether the breadcrumb is at the root (currentPath is empty) */
  export let isAtRoot: boolean = false;

  /** Callback when navigating to the root */
  export let onNavigateToRoot: () => void = () => {};
  /** Callback when navigating to a specific segment index */
  export let onNavigateToSegment: (index: number) => void = () => {};

  // Derived from currentPath
  $: segments = currentPath ? currentPath.split(PATH_DELIMITER) : [];

  // Responsive breadcrumb state
  let breadcrumbWrapper: HTMLDivElement | undefined = undefined;
  let maxVisibleSegments: number = Infinity;
  let resizeObserver: ResizeObserver | null = null;

  // Compute which segments to show vs collapse
  $: needsCollapsing = maxVisibleSegments !== Infinity && segments.length > maxVisibleSegments;
  $: collapsedSegments = needsCollapsing ? segments.slice(0, -maxVisibleSegments) : [];
  $: visibleSegments = needsCollapsing ? segments.slice(-maxVisibleSegments) : segments;
  $: visibleStartIndex = segments.length - visibleSegments.length;

  function measureBreadcrumbs() {
    if (!breadcrumbWrapper) {
      return;
    }

    const containerWidth = breadcrumbWrapper.clientWidth - CONTAINER_PADDING_PX;
    const items = breadcrumbWrapper.querySelectorAll('.breadcrumb-item-measure');

    if (items.length === 0) {
      return;
    }

    // Calculate total width needed for all items
    const itemWidths: number[] = [];
    items.forEach(item => {
      itemWidths.push((item as HTMLElement).offsetWidth);
    });

    // Total width = sum of items + separators between them
    const totalWidth = itemWidths.reduce((sum, w) => sum + w, 0) + (itemWidths.length - 1) * SEPARATOR_WIDTH_PX;

    // If everything fits, show all
    if (totalWidth <= containerWidth) {
      maxVisibleSegments = Infinity;
      return;
    }

    // We need to collapse some segments. Calculate how many we can show from the end.
    // Layout will be: [root] / [...] / [visible segments]
    const rootWidth = itemWidths[0];

    // Available space after root + ellipsis + their separators
    const reservedWidth = rootWidth + SEPARATOR_WIDTH_PX + ELLIPSIS_WIDTH_PX + SEPARATOR_WIDTH_PX;
    let availableWidth = containerWidth - reservedWidth;

    // Count how many segments from the end can fit
    let count = 0;
    for (let i = itemWidths.length - 1; i > 0; i--) {
      // Each segment needs its width + separator (except we already counted one separator in reserved)
      const segmentWidth = itemWidths[i] + (count > 0 ? SEPARATOR_WIDTH_PX : 0);
      if (availableWidth >= segmentWidth) {
        availableWidth -= segmentWidth;
        count++;
      } else {
        break;
      }
    }

    // Always show at least the last segment, even if it overflows (CSS will truncate with ellipsis)
    maxVisibleSegments = Math.max(1, count);
  }

  async function handleResize() {
    // Reset to measure all, then recalculate
    maxVisibleSegments = Infinity;
    await tick();
    measureBreadcrumbs();
  }

  function setupResizeObserver() {
    if (breadcrumbWrapper && !resizeObserver) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(breadcrumbWrapper);
    }
  }

  // Re-measure breadcrumbs when segments change
  $: if (breadcrumbWrapper && segments) {
    tick().then(measureBreadcrumbs);
  }

  onMount(() => {
    setupResizeObserver();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    };
  });
</script>

<div class="breadcrumb-wrapper" bind:this={breadcrumbWrapper}>
  <!-- Hidden measurement container - renders all items to measure their widths -->
  <div class="breadcrumb-measure-container text-xs" aria-hidden="true">
    <span class="breadcrumb-item-measure px-1">{rootLabel}</span>
    {#each segments as segment}
      <span class="breadcrumb-item-measure px-1">{segment}</span>
    {/each}
  </div>

  <Breadcrumb.Root>
    <Breadcrumb.List class="breadcrumbs gap-1 text-xs sm:gap-1">
      <!-- Root item - always visible -->
      <Breadcrumb.Item>
        {#if isAtRoot}
          <Breadcrumb.Page>
            <div class="px-1 py-0.5">
              {rootLabel}
            </div>
          </Breadcrumb.Page>
        {:else}
          <Breadcrumb.Link asChild let:attrs>
            <button {...attrs} on:click={onNavigateToRoot} title="Go to root">
              {rootLabel}
            </button>
          </Breadcrumb.Link>
        {/if}
      </Breadcrumb.Item>

      <!-- Ellipsis with dropdown for collapsed segments -->
      {#if needsCollapsing}
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <button use:builder.action {...builder} title="Show hidden folders">
                <Ellipsis size={14} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
              {#each collapsedSegments as segment, index}
                <DropdownMenu.Item size="sm" on:click={() => onNavigateToSegment(index)}>
                  {segment}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Breadcrumb.Item>
      {/if}

      <!-- Visible segments -->
      {#each visibleSegments as segment, index}
        {@const actualIndex = visibleStartIndex + index}
        <Breadcrumb.Separator />
        <Breadcrumb.Item class="overflow-hidden">
          {#if actualIndex === segments.length - 1}
            <Breadcrumb.Page class="overflow-hidden">
              <div class="overflow-hidden overflow-ellipsis whitespace-nowrap px-1">{segment}</div>
            </Breadcrumb.Page>
          {:else}
            <Breadcrumb.Link asChild let:attrs>
              <button {...attrs} on:click={() => onNavigateToSegment(actualIndex)}>
                {segment}
              </button>
            </Breadcrumb.Link>
          {/if}
        </Breadcrumb.Item>
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
</div>

<style>
  .breadcrumb-wrapper {
    overflow: hidden;
    position: relative;
  }

  :global(.breadcrumbs) {
    background: var(--st-gray-10, #f5f5f5);
    border-bottom: 1px solid var(--st-gray-20, #e0e0e0);
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 4px;
    overflow: hidden;
    padding: 3px 4px;
    position: relative;
  }

  /* Ensure all breadcrumb items stay on one line */
  :global(.breadcrumbs li) {
    display: inline-flex;
    flex-shrink: 0;
    min-width: 0;
    white-space: nowrap;
  }

  /* Last breadcrumb item can shrink and truncate */
  :global(.breadcrumbs li:last-child) {
    flex-shrink: 1;
    min-width: 40px;
    overflow: hidden;
  }

  /* Ensure separators don't wrap */
  :global(.breadcrumbs [data-slot='breadcrumb-separator']) {
    flex-shrink: 0;
  }

  :global(.breadcrumbs button) {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    max-width: 100%;
    overflow: hidden;
    padding: 2px 4px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Breadcrumb page content (non-clickable current page) */
  :global(.breadcrumbs [data-slot='breadcrumb-page']) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.breadcrumbs [data-slot='breadcrumb-page'] > div) {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.breadcrumbs button:hover) {
    background: var(--st-gray-20, #e0e0e0);
  }

  /* Hidden container for measuring breadcrumb item widths */
  .breadcrumb-measure-container {
    height: 0;
    left: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    top: 0;
    visibility: hidden;
    white-space: nowrap;
  }

  .breadcrumb-item-measure {
    display: inline-block;
  }
</style>
