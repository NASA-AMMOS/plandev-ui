<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { fade } from 'svelte/transition';

  export let hideAfterClick: boolean = true;

  export function hide(): void {
    shown = false;
    x = 0;
    y = 0;
  }

  export function show(e: MouseEvent): void {
    e.preventDefault();
    shown = true;
    x = e.clientX;
    y = e.clientY;
  }

  let div: HTMLDivElement;
  let shown = false;
  let x: number;
  let y: number;

  $: if (div) {
    const rect = div.getBoundingClientRect();
    x = Math.min(window.innerWidth - rect.width, x);
    if (y > window.innerHeight - rect.height) {
      y -= rect.height;
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
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    bind:this={div}
    class="context-menu"
    style:left={`${x}px`}
    style:top={`${y}px`}
    transition:fade={{ duration: 50 }}
    on:click|stopPropagation={onClick}
  >
    <slot />
  </div>
{/if}

<style>
  .context-menu {
    background: #fff;
    border: 1px solid var(--st-gray-30);
    border-radius: 4px;
    display: block;
    min-height: 64px;
    min-width: 150px;
    outline: 0;
    padding: 4px;
    position: absolute;
    z-index: 100;
  }
</style>
