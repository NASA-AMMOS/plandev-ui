<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  let container: HTMLDivElement;
  let input: HTMLInputElement | null;
  let inputObserver: MutationObserver;
  let left: HTMLDivElement | null;
  let right: HTMLDivElement | null;

  $: if (input && left) {
    const padLeft = 5;
    const padRight = 3;
    left.style.left = `${padLeft}px`;
    input.style.paddingLeft = `${padLeft + left.clientWidth + padRight}px`;
    setChildrenStyles([left]);
  }

  $: if (input && right) {
    const padLeft = 3;
    const padRight = 5;
    right.style.right = `${padRight}px`;
    input.style.paddingRight = `${padLeft + right.clientWidth + padRight}px`;
    setChildrenStyles([right]);
  }

  onMount(() => {
    input = container.querySelector('input');
    if (input) {
      inputObserver = new MutationObserver(inputObserverCallback);
      inputObserver.observe(input, { attributes: true });
    }
  });

  onDestroy(() => {
    if (inputObserver) {
      inputObserver.disconnect();
    }
  });

  function inputObserverCallback(mutations: MutationRecord[]) {
    for (const { attributeName } of mutations) {
      if (attributeName === 'class' || attributeName === 'disabled') {
        setChildrenStyles([left, right]);
      }
    }
  }

  function setChildrenStyles(elements: HTMLElement[]) {
    for (const el of elements) {
      if (el) {
        for (const child of Array.from(el.children)) {
          if (child.nodeName === 'I') {
            const i = child as HTMLElement;

            i.style.color = 'var(--st-input-icon-color)';
            i.style.cursor = 'auto';

            if (input.disabled) {
              i.style.color = 'var(--st-gray-30)';
              i.style.cursor = 'not-allowed';
            }

            if (input.classList.contains('error')) {
              i.style.color = 'var(--st-red)';
              i.style.cursor = 'auto';
            }
          }
        }
      }
    }
  }
</script>

<div bind:this={container} class="input">
  {#if $$slots.left}
    <div bind:this={left} class="left">
      <slot name="left" />
    </div>
  {/if}

  <slot>No input element provided!</slot>

  {#if $$slots.right}
    <div bind:this={right} class="right">
      <slot name="right" />
    </div>
  {/if}
</div>

<style>
  .input {
    align-items: center;
    display: inline-flex;
    position: relative;
    width: 100%;
  }

  .input > .left,
  .input > .right {
    position: absolute;
  }
</style>
