<svelte:options immutable={true} />

<script lang="ts">
  import { DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import { Ellipsis } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { ViewDefaultSectionColor } from '../../constants/view';
  import type { TimelineSection } from '../../types/timeline';
  import { getContrastingTextColor } from '../../utilities/timeline';

  export let dragDisabled: boolean = true;
  export let section: TimelineSection;
  export let width: number = 0;

  const dispatch = createEventDispatcher<{
    addRowToSection: void;
    contextMenu: MouseEvent;
    deleteSection: void;
    duplicateSection: void;
    editSection: void;
    mouseDownSectionMove: void;
    mouseUpSectionMove: void;
    moveSection: { direction: 'up' | 'down' };
    toggleCollapsed: { collapsed: boolean; sectionId: number };
  }>();

  // The band is the section color at full strength, so everything on it takes a foreground picked
  // against that color rather than a fixed grey.
  $: bandColor = section.color || ViewDefaultSectionColor;
  $: foreground = getContrastingTextColor(bandColor);

  function toggleCollapsed() {
    dispatch('toggleCollapsed', { collapsed: !section.collapsed, sectionId: section.id });
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    // Without this the event reaches the timeline's own contextmenu handler, which overwrites
    // the section menu with the generic one.
    e.stopPropagation();
    dispatch('contextMenu', e);
  }
</script>

<div
  class="section-header"
  style:width={`${width}px`}
  style:--section-accent-color={bandColor}
  style:border-bottom={`1px solid ${bandColor}`}
  style:--section-foreground={foreground}
  class:collapsed={section.collapsed}
  aria-label="{section.name} controls"
  role="group"
  on:contextmenu={onContextMenu}
>
  <!-- Caret, name and count are one target spanning the band, the way a row header's are: the
       whole strip folds the section, and hovering it washes with the band's own foreground. -->
  <button
    aria-expanded={!section.collapsed}
    aria-label={section.collapsed ? 'Expand Section' : 'Collapse Section'}
    class="st-button icon section-header-toggle"
    on:click={toggleCollapsed}
  >
    {#if section.collapsed}
      <CaretRightIcon class="section-header-collapse" />
    {:else}
      <CaretDownIcon class="section-header-collapse" />
    {/if}

    <!-- Also the drag surface: canDrag hit-tests for .section-title. -->
    <div
      class="section-title st-typography-label"
      on:mousedown={() => dispatch('mouseDownSectionMove')}
      on:mouseup={() => dispatch('mouseUpSectionMove')}
      role="none"
      style:cursor={dragDisabled ? 'grab' : 'grabbing'}
    >
      {section.name}
    </div>

    {#if section.collapsed && section.rowIds.length > 0}
      <span class="section-hidden-count st-typography-body">{section.rowIds.length} hidden</span>
    {/if}
  </button>

  <!-- The right-click menu's actions, reachable without knowing to right-click. Revealed on
       hover so the band stays clean at rest. -->
  <div class="section-actions">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild let:builder>
        <button aria-label="Section Actions" use:builder.action {...builder} class="st-button icon">
          <Ellipsis size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item size="sm" on:click={() => dispatch('editSection')}>Edit Section</DropdownMenu.Item>
        <DropdownMenu.Item size="sm" on:click={() => dispatch('addRowToSection')}>Add Row to Section</DropdownMenu.Item>
        <DropdownMenu.Item size="sm" on:click={() => dispatch('duplicateSection')}>Duplicate Section</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <!-- Keyboard-reachable reordering, matching the Move Up/Down rows have always had. -->
        <DropdownMenu.Item size="sm" on:click={() => dispatch('moveSection', { direction: 'up' })}>
          Move Section Up
        </DropdownMenu.Item>
        <DropdownMenu.Item size="sm" on:click={() => dispatch('moveSection', { direction: 'down' })}>
          Move Section Down
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item size="sm" on:click={() => dispatch('deleteSection')}>Delete Section</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <slot />
</div>

<style>
  .section-header {
    align-items: center;
    background-color: var(--section-accent-color);
    color: var(--section-foreground);
    display: flex;
    height: 28px;
    padding: 0;
    position: relative;
    z-index: 5;
  }

  .section-header.collapsed {
    border-bottom: 1px solid var(--st-gray-30);
  }

  /* Full-strength rail, flush left, continuing down through the section's rows. */
  .section-header::before {
    background-color: var(--section-accent-color);
    bottom: -1px;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 3px;
  }

  /* Everything on the band takes its contrast foreground. Named individually rather than with a
     universal selector, which would also flatten a child added later that is deliberately
     colored. The two text elements have to be listed even though their parent button is already
     covered: they carry .st-typography-label / .st-typography-body, which set a color of their
     own, and a directly-matching declaration always beats an inherited value. */
  .section-header :global(.st-button),
  .section-header :global(svg),
  .section-hidden-count,
  .section-title {
    color: inherit;
  }

  /* Fills the band left of the actions. No padding and no gap, so the caret sits at the header's
     left edge and the name immediately after it - the same two x positions as a root row's. */
  .section-header-toggle {
    border-radius: 0;
    flex: 1;
    gap: 0;
    height: 100%;
    justify-content: flex-start;
    min-width: 0;
    padding: 0;
    text-align: left;
  }

  /* The default grey button hover reads as a hole punched in a saturated band, so band controls
     wash with their own foreground instead. */
  .section-header :global(.st-button.icon:hover) {
    background: color-mix(in srgb, var(--section-foreground) 15%, transparent);
  }

  .section-title {
    flex: 1;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
    white-space: nowrap;
  }

  .section-hidden-count {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    margin-right: 8px;
    opacity: 0.8;
    white-space: nowrap;
  }

  /* Actions stay hidden until the band is hovered or focused, matching the editor list. */
  .section-actions {
    flex-shrink: 0;
    margin-right: 4px;
    opacity: 0;
    transition: opacity 100ms ease-in-out;
  }

  .section-header:hover .section-actions,
  .section-header:focus-within .section-actions {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .section-actions {
      transition: none;
    }
  }

  /* Held back at rest, full strength on hover. Both states are the band's own foreground, so
     neither washes out however saturated the color is. */
  :global(.section-header-collapse) {
    flex-shrink: 0;
    opacity: 0.75;
  }

  .section-header :global(.st-button):hover :global(.section-header-collapse) {
    opacity: 1;
  }
</style>
