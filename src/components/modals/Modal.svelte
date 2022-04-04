<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  export let context: any = {};
  export let height = 350;
  export let shown = false;
  export let width = 400;

  export function hide(): void {
    context = {};
    shown = false;
  }

  export function show(ctx: any = {}): void {
    context = ctx;
    shown = true;
    dispatch('show', shown);
  }

  export function toggle(ctx: any = {}): void {
    if (shown) {
      hide();
    } else {
      show(ctx);
    }
  }

  const dispatch = createEventDispatcher();

  function onKeydownBody(event: KeyboardEvent): void {
    if (event.key == 'Escape') {
      hide();
    }
  }
</script>

<svelte:body on:click={hide} on:keydown={onKeydownBody} />

{#if shown}
  <div class="modal-container" transition:fade={{ duration: 50 }}>
    <div class="modal" style:height={`${height}px`} style:width={`${width}px`} on:click|stopPropagation>
      <slot />
    </div>
  </div>
{/if}

<style>
  .modal-container {
    align-items: center;
    background-color: #00000052;
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 999;
  }

  .modal {
    background-color: var(--st-primary-background-color);
    border-radius: 4px;
    color: var(--st-primary-text-color);
    display: flex;
    flex-direction: column;
    font-family: Inter, Roboto;
    font-size: 12px;
    font-weight: 300;
    justify-content: space-evenly;
    min-height: 150px;
    text-align: left;
    z-index: 1000;
  }
</style>
