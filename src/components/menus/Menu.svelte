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
    // TODO: https://github.com/sveltejs/language-tools/issues/1229
    if (type) {
      hideFns[type].forEach(hide => {
        hide();
      });
    } else {
      hideFns.dropdown.forEach(hide => {
        hide();
      });
      hideFns.input.forEach(hide => {
        hide();
      });
    }
  }
</script>

<script lang="ts">
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
  }

  export function toggle(): void {
    if (shown) {
      hide();
    } else {
      show();
    }
  }

  const dispatch = createEventDispatcher();

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
  <div
    class="menu"
    role="menu"
    use:popperRef
    on:click|stopPropagation={onClick}
    on:mouseenter={() => {
      // TODO why is this necessary? Also destroys tooltips and they don't show up
      // after menus are opened if they were previously shown.
      // hideAllTooltips();
    }}
  >
    <div
      class="menu-slot st-typography-medium"
      style:width={typeof width === 'number' ? `${width}px` : null}
      use:popperContent={extraOpts}
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
    top: 0;
    width: 100%;
  }

  .menu-slot {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px -1px #0003, 0 4px 5px #00000024, 0 1px 10px #0000001f;
    outline: 0;
    overflow: hidden;
    z-index: 1000;
  }
</style>
