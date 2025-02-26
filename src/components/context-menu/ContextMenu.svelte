<svelte:options accessors={true} immutable={true} />

<script lang="ts" context="module">
  type HideFns = Set<() => void>;
  const hideFns: HideFns = new Set<() => void>();

  export function hideAllMenus() {
    hideFns.forEach(hideFn => {
      hideFn();
    });
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  const dispatch = createEventDispatcher<{
    hide: void;
  }>();

  export let hideAfterClick: boolean = true;

  let xAnchor: number | null = null;

  export function hide(notify = false): void {
    shown = false;
    x = 0;
    y = 0;
    if (notify) {
      dispatch('hide');
    }
  }

  export function isShown() {
    return shown;
  }

  export function showDirectly(_x: number, _y: number, _xAnchor: number): void {
    shown = true;
    x = _x;
    y = _y;
    xAnchor = _xAnchor;
  }

  export function show(e: MouseEvent): void {
    hideAllMenus();
    e.preventDefault();
    shown = true;
    x = e.clientX;
    y = e.clientY;
  }

  let div: HTMLDivElement;
  let shown: boolean = false;
  let x: number;
  let y: number;

  onMount(() => {
    hideFns.add(hide);
  });

  onDestroy(() => {
    hideFns.delete(hide);
  });

  $: if (div) {
    const rect = div.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) {
      if (xAnchor !== null) {
        x = xAnchor - rect.width;
      } else {
        x = x - rect.width;
      }
    }
    if (y > window.innerHeight - rect.height) {
      y = Math.max(window.innerHeight - rect.height, 8);
    }
  }

  function onClick() {
    if (hideAfterClick) {
      hide(true);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (shown && event.key === 'Escape') {
      hide(true);
      event.stopPropagation();
    }
  }
</script>

<svelte:body on:click={() => hide(true)} on:keydown|capture={onKeyDown} />

{#if shown}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <div
    bind:this={div}
    class="context-menu"
    role="none"
    style:left={`${x}px`}
    style:top={`${y}px`}
    transition:fade={{ duration: 50 }}
    on:click|stopPropagation={onClick}
    on:mouseout
    on:mouseover
  >
    <slot />
  </div>
{/if}

<style>
  .context-menu {
    background: #fff;
    border: var(--st-border-popover);
    border-radius: var(--st-border-radius-popover);
    box-shadow: var(--st-shadow-popover);
    display: block;
    max-height: calc(100vh - 16px);
    min-width: 150px;
    outline: 0;
    overflow: auto;
    padding: 4px;
    position: fixed;
    z-index: 100;
  }
</style>
