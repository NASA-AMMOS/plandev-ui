<svelte:options accessors={true} />

<script lang="ts">
  import { hideAll } from 'tippy.js';
  import { fade } from 'svelte/transition';

  export let right: string = 'auto';
  export let shown = false;
  export let top: string = 'auto';

  export function hide(): void {
    shown = false;
  }

  export function show(): void {
    hideAll();
    shown = true;
  }

  export function toggle(): void {
    if (shown) {
      hide();
    } else {
      show();
    }
  }
</script>

<svelte:body on:click={hide} />

{#if shown}
  <div
    class="menu-container"
    style:right
    style:top
    transition:fade={{ duration: 200 }}
    on:mouseenter={() => hideAll()}
  >
    <div class="menu" on:click|stopPropagation>
      <slot />
    </div>
  </div>
{/if}

<style>
  .menu-container {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px -1px #0003, 0 4px 5px 0 #00000024,
      0 1px 10px 0 #0000001f;
    color: var(--st-primary-text-color);
    font-size: 1rem;
    min-height: 64px;
    min-width: 150px;
    outline: 0;
    position: absolute;
    right: 0;
    z-index: 100;
  }

  .menu {
    flex-direction: column;
    display: flex;
    width: 100%;
  }

  .menu :global(.menu-item) {
    display: grid;
    font-size: 0.8rem;
    font-weight: 300;
    gap: 0.5rem;
    grid-template-columns: 1rem auto;
    justify-content: flex-start;
    overflow: hidden;
    padding: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .menu :global(.menu-item:hover) {
    background: var(--st-gray-20);
    border-radius: 4px;
  }

  .menu :global(.menu-item.disabled) {
    color: var(--st-gray-40);
    cursor: not-allowed;
  }
</style>
