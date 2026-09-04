<svelte:options accessors={true} immutable={true} />

<script lang="ts" context="module">
  export type MenuType = 'dropdown' | 'input';
  type HideFns = {
    dropdown: Set<() => void>;
    input: Set<() => void>;
  };
  const hideFns: HideFns = {
    dropdown: new Set<() => void>(),
    input: new Set<() => void>(),
  };

  /** Gap left between a menu and the viewport edge when it has to flip or shift to stay on screen. */
  const MENU_VIEWPORT_PADDING = 8;

  const OPPOSITE_SIDES: Record<string, string> = {
    bottom: 'top',
    left: 'right',
    right: 'left',
    top: 'bottom',
  };

  /**
   * The placement to fall back to when a menu will not fit where it was asked to go: the opposite side,
   * with the alignment left alone.
   *
   * Keeping the alignment is the point. Flipping 'bottom-end' to a hardcoded 'top-start' also swaps
   * right-alignment for left-alignment, which sends a menu anchored near the right edge of the window
   * off the screen -- visible on the layer settings menu whenever the timeline editor sits in the
   * right-hand panel.
   */
  function getOppositeSidePlacement(placement: string): string {
    const [side, alignment] = placement.split('-');
    const oppositeSide = OPPOSITE_SIDES[side] ?? side;
    return alignment ? `${oppositeSide}-${alignment}` : oppositeSide;
  }

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
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';
  import type { Placement } from 'tippy.js';

  /**
   * Lets content escape this menu's box, for a menu that hosts another menu such as a color picker.
   * Popper positions this element with a transform, making it the containing block for its
   * fixed-position descendants, so the global `.st-menu { overflow: hidden }` that clips content to the
   * border radius clips any nested popup too. Off by default so ordinary menus keep that clipping.
   */
  export let allowOverflow: boolean = false;
  /**
   * Positions against the viewport instead of the nearest scrolling ancestor. Set on a menu nested
   * inside a scrollable menu: Popper's default boundary is the clipping parents, so a nested popup gets
   * squeezed to fit inside the scroll box rather than opening where it belongs. Distinct from
   * allowOverflow -- that governs CSS clipping, this governs the position math.
   */
  export let escapeScrollBoundary: boolean = false;
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

  const [popperRef, popperContent, getPopperInstance] = createPopperActions({
    placement,
    strategy: 'fixed',
  });
  const boundary = escapeScrollBoundary ? 'viewport' : 'clippingParents';
  const extraOpts = {
    modifiers: [
      {
        enabled: true,
        name: 'flip',
        options: {
          boundary,
          fallbackPlacements: [getOppositeSidePlacement(placement)],
        },
      },
      // Keeps a menu off the viewport edge when it flips or shifts, rather than sitting flush against it
      { name: 'preventOverflow', options: { boundary, padding: MENU_VIEWPORT_PADDING } },
      { name: 'offset', options: { offset } },
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

  /**
   * Repositions the menu when its own content changes size. Popper only recomputes on scroll and window
   * resize, so a menu that reveals or hides rows -- the layer settings menu does, behind its fill
   * toggle -- keeps the position it was given at its old height and drifts out of alignment with the
   * button that opened it.
   */
  function repositionOnResize(node: HTMLElement) {
    if (typeof ResizeObserver === 'undefined') {
      return {};
    }
    const observer = new ResizeObserver(() => {
      getPopperInstance()?.update();
    });
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }
</script>

<svelte:body on:click={hide} />

{#if shown}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
  <div class="menu pointer-events-none" role="menu" use:popperRef on:click|stopPropagation={onClick}>
    <div
      class="st-menu st-typography-medium pointer-events-auto"
      style:overflow={allowOverflow ? 'visible' : null}
      style:width={typeof width === 'number' ? `${width}px` : null}
      use:popperContent={extraOpts}
      use:repositionOnResize
    >
      <slot />
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
</style>
