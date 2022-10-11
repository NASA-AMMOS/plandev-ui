<svelte:options accessors={true} immutable={true} />

<script lang="ts" context="module">
  const hideFns = new Set<() => void>();

  export function hideAllMenus() {
    // TODO: https://github.com/sveltejs/language-tools/issues/1229
    hideFns.forEach(hide => {
      hide();
    });
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createPopperActions } from 'svelte-popperjs';
  import { hideAll as hideAllTooltips } from 'tippy.js';

  export let hideAfterClick: boolean = true;
  export let offset: number[] = [0, 1];
  export let shown = false;

  export function hide(): void {
    shown = false;
  }

  export function show(): void {
    hideAllMenus();
    hideAllTooltips();
    shown = true;
  }

  export function toggle(): void {
    if (shown) {
      hide();
    } else {
      show();
    }
  }

  const [popperRef, popperContent] = createPopperActions({
    placement: 'bottom-start',
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
    hideFns.add(hide);
  });

  onDestroy(() => {
    hideFns.delete(hide);
  });

  function onClick() {
    if (hideAfterClick) {
      hide();
    }
  }
</script>

<svelte:body on:click={hide} />

{#if shown}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="menu" use:popperRef on:click|stopPropagation={onClick} on:mouseenter={() => hideAllTooltips()}>
    <div class="menu-slot st-typography-medium" use:popperContent={extraOpts}>
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
    z-index: 1000;
  }
</style>
