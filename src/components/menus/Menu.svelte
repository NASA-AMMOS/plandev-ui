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
  import { hideAll as hideAllTooltips } from 'tippy.js';
  import { fade } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';

  export let hideAfterClick: boolean = true;
  export let left: string = 'auto';
  export let right: string = 'auto';
  export let shown = false;
  export let top: string = 'auto';

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
    style:left
    style:right
    style:top
    transition:fade={{ duration: 50 }}
    on:click|stopPropagation={onClick}
    on:mouseenter={() => hideAllTooltips()}
  >
    <slot />
  </div>
{/if}

<style>
  .menu {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px -1px #0003, 0 4px 5px #00000024, 0 1px 10px #0000001f;
    color: var(--st-primary-text-color);
    display: flex;
    flex-direction: column;
    font-size: 1rem;
    min-height: 32px;
    min-width: 150px;
    outline: 0;
    position: absolute;
    z-index: 100;
  }
</style>
