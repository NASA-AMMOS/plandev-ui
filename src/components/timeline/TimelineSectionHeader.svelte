<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { TimelineSection } from '../../types/timeline';

  export let section: TimelineSection;
  export let width: number = 0;
  export let dragDisabled: boolean = true;

  const dispatch = createEventDispatcher<{
    contextMenu: MouseEvent;
    mouseDownSectionMove: void;
    mouseUpSectionMove: void;
    toggleCollapsed: { collapsed: boolean; sectionId: number };
  }>();

  // Pick a readable text color for the section's background color.
  function getContrastTextColor(hex: string): string {
    const normalized = hex.replace('#', '');
    const full =
      normalized.length === 3
        ? normalized
            .split('')
            .map(c => c + c)
            .join('')
        : normalized;
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    // Perceptual luminance (0-1); switch to light text on dark backgrounds.
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? 'var(--st-gray-90)' : '#ffffff';
  }

  $: textColor = section.color ? getContrastTextColor(section.color) : null;

  function toggleCollapsed() {
    dispatch('toggleCollapsed', { collapsed: !section.collapsed, sectionId: section.id });
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    dispatch('contextMenu', e);
  }
</script>

<div
  class="section-header"
  style:width={`${width}px`}
  style:background-color={section.color ?? undefined}
  style:color={textColor ?? undefined}
  class:collapsed={section.collapsed}
  class:has-color={!!section.color}
  role="banner"
  on:contextmenu={onContextMenu}
>
  <!-- Mirrors RowHeader: caret + title are one button so a click on either toggles the
       section, while the title doubles as the drag handle (canDrag matches .section-title). -->
  <button
    aria-expanded={!section.collapsed}
    aria-label={section.collapsed ? 'Expand Section' : 'Collapse Section'}
    class="st-button icon section-header-title-button"
    on:click={toggleCollapsed}
  >
    {#if section.collapsed}
      <CaretRightIcon class="section-header-collapse" />
    {:else}
      <CaretDownIcon class="section-header-collapse" />
    {/if}
    <div
      class="section-title st-typography-label"
      on:mousedown={() => dispatch('mouseDownSectionMove')}
      on:mouseup={() => dispatch('mouseUpSectionMove')}
      role="none"
      style:cursor={dragDisabled ? 'grab' : 'grabbing'}
    >
      {section.name}
    </div>
  </button>

  <slot />
</div>

<style>
  .section-header {
    align-items: center;
    background-color: var(--st-gray-15);
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    gap: 4px;
    height: 28px;
    padding: 0;
    position: relative;
    z-index: 5;
  }

  .section-header.collapsed {
    border-bottom: 1px solid var(--st-gray-30);
  }

  .section-header-title-button {
    flex: 1;
    justify-content: flex-start;
    text-align: left;
  }

  .section-header .section-header-title-button:hover {
    background: initial;
  }

  .section-title {
    color: var(--st-gray-70);
    flex: 1;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
    white-space: nowrap;
  }

  .section-header:not(.has-color):hover .section-title {
    color: var(--st-gray-90);
  }

  /* When a section color is applied, the title adopts the contrast text color.
     The button must also inherit so the title (nested inside it) resolves `inherit`
     to the header's contrast color rather than the default button text color. */
  .section-header.has-color .section-header-title-button,
  .section-header.has-color .section-title {
    color: inherit;
  }

  .section-header:not(.has-color) :global(.st-button):hover :global(.section-header-collapse) {
    color: var(--st-gray-50);
  }

  /* Colored sections: the chevron follows the contrast text color (kept slightly
     subdued, full strength on hover) so it stays legible on any background. */
  .section-header.has-color :global(.section-header-collapse) {
    color: inherit;
    opacity: 0.7;
  }

  .section-header.has-color :global(.st-button):hover :global(.section-header-collapse) {
    opacity: 1;
  }

  :global(.section-header-collapse) {
    color: var(--st-gray-30);
    flex-shrink: 0;
  }
</style>
