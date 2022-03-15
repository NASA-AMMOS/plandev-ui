<svelte:options accessors={true} />

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

  function onClickBody(): void {
    hide();
  }

  function onKeydownBody(event: KeyboardEvent): void {
    if (event.key == 'Escape') {
      hide();
    }
  }
</script>

<svelte:body on:click={onClickBody} on:keydown={onKeydownBody} />

{#if shown}
  <div class="modal-container" transition:fade={{ duration: 50 }}>
    <div
      class="modal"
      style="height: {height}px; width: {width}px"
      on:click|stopPropagation
    >
      <slot />
    </div>
  </div>
{/if}

<style>
  .modal-container {
    align-items: center;
    background: #00000052;
    bottom: 0;
    display: flex;
    left: 0;
    position: absolute;
    justify-content: center;
    right: 0;
    top: 0;
    z-index: 999;
  }

  .modal {
    background-color: var(--st-gray-10);
    border-radius: 4px;
    box-shadow: 0px 4px 32px rgba(0, 0, 0, 0.24);
    display: flex;
    flex-direction: column;
    height: 350px;
    justify-content: space-evenly;
    left: 50%;
    max-height: 80vh;
    max-width: 90vw;
    min-height: 150px;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 380px;
    z-index: 1000;
  }

  .modal > :global(.header),
  .modal > :global(.footer) {
    align-items: center;
    background-color: var(--st-gray-20);
    color: var(--st-gray-100);
    display: flex;
    height: 40px;
    padding: 1rem;
    width: 100%;
  }

  .modal > :global(.header) {
    border-radius: 4px 4px 0px 0px;
    font-size: 1rem;
    font-weight: 700;
    justify-content: space-between;
  }

  .modal > :global(.footer) {
    border-radius: 0px 0px 4px 4px;
    justify-content: flex-end;
  }

  .modal > :global(.footer > button) {
    margin-left: 5px;
    width: 80px;
  }

  .modal > :global(.footer > .st-button.secondary) {
    border: 1px solid var(--st-gray-30);
  }

  .modal > :global(.content) {
    flex: auto;
    padding: 1rem;
  }
</style>
