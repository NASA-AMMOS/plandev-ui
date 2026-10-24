<svelte:options accessors={true} immutable={true} />

<script lang="ts" context="module">
  type MenuType = 'dropdown' | 'input';
  type HideFns = {
    dropdown: Set<() => void>;
    input: Set<() => void>;
  };
  const hideFns: HideFns = {
    dropdown: new Set<() => void>(),
    input: new Set<() => void>(),
  };

  export function hideAllMenus(type?: MenuType) {
    if (type) {
      hideFns[type].forEach(hideFn => {
        hideFn();
      });
    } else {
      hideFns.dropdown.forEach(hideFn => {
        hideFn();
      });
      hideFns.input.forEach(hideFn => {
        hideFn();
      });
    }
  }
</script>

<script lang="ts">
  import type { ModifierPhases, State } from '@popperjs/core';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';
  import type { Placement } from 'tippy.js';

  export let hideAfterClick: boolean = true;
  export let offset: number[] = [0, 1];
  export let isMounted: boolean = false;
  export let placement: Placement = 'bottom-start';
  export let type: MenuType = 'dropdown';
  export let width: number | null = null;

  // The shown state is intentionally private.
  // Use the accessor functions to change this state.
  // This is so we can more easily control global state of all Menus on a page.
  // See 'hideAllMenus' above.
  let shown: boolean = false;

  $: if (isMounted) {
    if (shown) {
      document.addEventListener('keydown', onDocumentKeydown);
    } else {
      document.removeEventListener('keydown', onDocumentKeydown);
    }
  }

  export function hide(): void {
    if (shown) {
      dispatch('hide');
    }
    shown = false;
  }

  export function isShown(): boolean {
    return shown;
  }

  export function show(): void {
    hideAllMenus(type);
    shown = true;
    dispatch('show');
  }

  export function toggle(): void {
    if (shown) {
      hide();
    } else {
      show();
    }
  }

  const dispatch = createEventDispatcher<{
    hide: void;
    show: void;
  }>();

  // Minimum gap between a menu and the edge of the viewport
  const viewportPadding: number = 8;

  const [popperRef, popperContent] = createPopperActions({
    placement,
    strategy: 'fixed',
  });
  const extraOpts = {
    modifiers: [
      {
        enabled: true,
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start'],
        },
      },
      { name: 'offset', options: { offset } },
      {
        // Caps the menu to the space left in the viewport so long menus scroll (or clip) instead of being cut off.
        // On the axis the menu is placed along, the space between the reference and the viewport edge is available;
        // on the other axis `preventOverflow` shifts the menu into view, so the full viewport is available.
        enabled: true,
        fn: ({ state }: { state: State }) => {
          const { bottom, left, right, top } = state.elements.reference.getBoundingClientRect();
          const { innerHeight, innerWidth } = window;
          const distance = offset[1] || 0;
          const basePlacement = state.placement.split('-')[0];
          let availableHeight = innerHeight - viewportPadding * 2;
          let availableWidth = innerWidth - viewportPadding * 2;
          if (basePlacement === 'top') {
            availableHeight = top - distance - viewportPadding;
          } else if (basePlacement === 'bottom') {
            availableHeight = innerHeight - bottom - distance - viewportPadding;
          } else if (basePlacement === 'left') {
            availableWidth = left - distance - viewportPadding;
          } else if (basePlacement === 'right') {
            availableWidth = innerWidth - right - distance - viewportPadding;
          }
          state.styles.popper.maxHeight = `${Math.max(availableHeight, 0)}px`;
          state.styles.popper.maxWidth = `${Math.max(availableWidth, 0)}px`;
        },
        name: 'fitViewport',
        phase: 'beforeWrite' as ModifierPhases,
        requires: ['computeStyles'],
      },
    ],
  };

  onMount(() => {
    hideFns[type].add(hide);
    isMounted = true;
  });

  onDestroy(() => {
    hideFns[type].delete(hide);
  });

  function onDocumentKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      hideAllMenus();
    }
  }

  function onClick() {
    if (hideAfterClick) {
      hide();
    }
  }
</script>

<svelte:body on:click={hide} />

{#if shown}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
  <div class="menu pointer-events-none" role="menu" use:popperRef on:click|stopPropagation={onClick}>
    <div
      class="st-menu st-typography-medium pointer-events-auto"
      style:width={typeof width === 'number' ? `${width}px` : null}
      use:popperContent={extraOpts}
    >
      <!-- Scroll the content rather than the positioned element: popper listens for scroll on the
           element it positions and would re-run positioning on every scroll tick, which fights a scrollbar drag -->
      <div class="menu-content">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .menu {
    height: 100%;
    left: 0;
    position: absolute;
    top: 4px;
    width: 100%;
  }

  .st-menu {
    display: flex;
    flex-direction: column;
  }

  .menu-content {
    min-height: 0;
    overflow: hidden auto;
  }
</style>
