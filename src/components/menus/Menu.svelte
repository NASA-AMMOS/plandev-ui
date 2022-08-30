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
  import { hideAll as hideAllTooltips } from 'tippy.js';

  export let hideAfterClick: boolean = true;
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
  <div
    class="menu"
    style:left="0"
    style:top="115%"
    on:click|stopPropagation={onClick}
    on:mouseenter={() => hideAllTooltips()}
  >
    <div class="menu-slot st-typography-body">
      <slot />
    </div>
  </div>
{/if}

<style>
  .menu {
    position: absolute;
  }

  .menu-slot {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px -1px #0003, 0 4px 5px #00000024, 0 1px 10px #0000001f;
    outline: 0;
    position: fixed;
    z-index: 1000;
  }
</style>
