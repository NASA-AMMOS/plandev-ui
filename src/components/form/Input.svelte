<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { classNames } from '../../utilities/generic';

  export let layout: 'inline' | 'stacked' | null = 'stacked';
  export { className as class };

  let className: string = '';
  let container: HTMLDivElement;
  let containerObserver: MutationObserver;
  let input: HTMLInputElement | null;
  let inputObserver: MutationObserver;
  let left: HTMLDivElement | null;
  let right: HTMLDivElement | null;

  $: if (input && left) {
    padLeftSlot();
  }

  $: if (input && right) {
    padRightSlot();
  }

  $: inputClasses = classNames('input', {
    [className]: !!className,
    'input-inline': layout === 'inline',
    'input-stacked': layout === 'stacked',
  });

  onMount(() => {
    input = container.querySelector('input');
    if (input) {
      inputObserver = new MutationObserver(inputObserverCallback);
      inputObserver.observe(input, { attributes: true });
    }

    containerObserver = new MutationObserver(containerObserverCallback);
    containerObserver.observe(container, { childList: true, subtree: true });
  });

  onDestroy(() => {
    if (inputObserver) {
      inputObserver.disconnect();
    }

    if (containerObserver) {
      containerObserver.disconnect();
    }
  });

  function padLeftSlot() {
    const padLeft = 5;
    const padRight = 3;
    left.style.left = `${padLeft}px`;
    input.style.paddingLeft = `${padLeft + left.clientWidth + padRight}px`;
    setChildrenStyles([left]);
  }

  function padRightSlot() {
    const padLeft = 3;
    const padRight = 5;
    right.style.right = `${padRight}px`;
    input.style.paddingRight = `${padLeft + right.clientWidth + padRight}px`;
    setChildrenStyles([right]);
  }

  function inputObserverCallback(mutations: MutationRecord[]) {
    for (const { attributeName } of mutations) {
      if (attributeName === 'class' || attributeName === 'disabled') {
        setChildrenStyles([left, right]);
      }
    }
  }

  function containerObserverCallback() {
    if (left) {
      padLeftSlot();
    }
    if (right) {
      padRightSlot();
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

<div bind:this={container} class={inputClasses}>
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
    cursor: default;
    position: absolute;
  }

  .input-inline {
    display: grid;
    gap: 8px;
    grid-template-columns: 40% auto;
    padding: 4px 0px;
  }

  .input-inline :global(label) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .input-stacked {
    display: inherit;
    gap: 4px;
  }
</style>
