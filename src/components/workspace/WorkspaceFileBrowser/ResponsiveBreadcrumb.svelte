<svelte:options immutable={true} />

<script lang="ts">
  import { Breadcrumb, Button, DropdownMenu } from '@nasa-jpl/stellar-svelte';
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

  // Responsive breadcrumb state
  let breadcrumbWrapper: HTMLDivElement | undefined = undefined;
  let collapsedSegments: string[] = [];
  let maxVisibleSegments: number = Infinity;
  let needsCollapsing: boolean = false;
  let resizeObserver: ResizeObserver | null = null;
  let segments: string[] = []; // breadcrumb segments derived from currentPath
  let visibleSegments: string[] = [];
  let visibleStartIndex: number = 0;

  $: segments = currentPath ? currentPath.split(PATH_DELIMITER) : [];
  $: needsCollapsing = maxVisibleSegments !== Infinity && segments.length > maxVisibleSegments;
  $: collapsedSegments = needsCollapsing ? segments.slice(0, -maxVisibleSegments) : [];
  $: visibleSegments = needsCollapsing ? segments.slice(-maxVisibleSegments) : segments;
  $: visibleStartIndex = segments.length - visibleSegments.length;

  function measureBreadcrumbs() {
    if (!breadcrumbWrapper) {
      return;
    }

    const containerWidth = breadcrumbWrapper.clientWidth - CONTAINER_PADDING_PX;
    const items = breadcrumbWrapper.querySelectorAll('[data-measure]');

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

<div class="relative overflow-hidden" bind:this={breadcrumbWrapper}>
  <!-- Hidden measurement container - renders all items to measure their widths -->
  <div class="invisible absolute left-0 top-0 h-0 overflow-hidden whitespace-nowrap text-xs" aria-hidden="true">
    <span class="inline-block px-1" data-measure>{rootLabel}</span>
    {#each segments as segment}
      <span class="inline-block px-1" data-measure>{segment}</span>
    {/each}
  </div>

  <Breadcrumb.Root>
    <Breadcrumb.List
      class="breadcrumbs relative flex-nowrap gap-0.5 overflow-hidden border-b px-1 py-[3px] text-xs sm:gap-0.5 [&_li:last-child]:min-w-10 [&_li:last-child]:flex-shrink [&_li:last-child]:overflow-hidden"
    >
      <!-- Root item - always visible -->
      <Breadcrumb.Item class="inline-flex min-w-0 flex-shrink-0 whitespace-nowrap">
        {#if isAtRoot}
          <Breadcrumb.Page class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
            <div class="flex min-h-6 items-center overflow-hidden overflow-ellipsis whitespace-nowrap px-1 py-0.5">
              {rootLabel}
            </div>
          </Breadcrumb.Page>
        {:else}
          <Breadcrumb.Link asChild let:attrs>
            <Button
              variant="ghost"
              {...attrs}
              class="inline-flex max-w-full text-ellipsis whitespace-nowrap px-1 py-0.5 font-normal"
              on:click={onNavigateToRoot}
              title="Go to root"
            >
              {rootLabel}
            </Button>
          </Breadcrumb.Link>
        {/if}
      </Breadcrumb.Item>

      <!-- Ellipsis with dropdown for collapsed segments -->
      {#if needsCollapsing}
        <Breadcrumb.Separator class="flex-shrink-0" />
        <Breadcrumb.Item class="inline-flex min-w-0 flex-shrink-0 whitespace-nowrap">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <Button
                variant="ghost"
                builders={[builder]}
                class="inline-flex max-w-full text-ellipsis whitespace-nowrap px-1 py-0.5 font-normal"
                title="Show hidden folders"
              >
                <Ellipsis size={14} />
              </Button>
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
            <Breadcrumb.Page class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              <div class="overflow-hidden overflow-ellipsis whitespace-nowrap px-1">{segment}</div>
            </Breadcrumb.Page>
          {:else}
            <Breadcrumb.Link asChild let:attrs>
              <Button
                variant="ghost"
                {...attrs}
                class="inline-flex max-w-full text-ellipsis whitespace-nowrap px-1 py-0.5 font-normal"
                on:click={() => onNavigateToSegment(actualIndex)}
              >
                {segment}
              </Button>
            </Breadcrumb.Link>
          {/if}
        </Breadcrumb.Item>
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
</div>
