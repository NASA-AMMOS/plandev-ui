<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { classNames, filterEmpty } from '../../utilities/generic';

  export let layout: 'inline' | 'stacked' | null = 'stacked';
  export { className as class };

  const padLeft = 5;
  const padRight = 6;

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
    if (left !== null) {
      left.style.left = `${padLeft}px`;
      left.style.width = 'min-content';

      if (input !== null) {
        input.style.paddingLeft = `min(40%, ${padLeft + padRight}px)`;
      }
      setChildrenStyles([left]);
    }
    // because the content of the slot might not have been fully rendered by the time this function is called
    // we must kick it out to a timeout to wait for it to be rendered
    setTimeout(() => {
      if (left !== null) {
        left.style.left = `${padLeft}px`;

        left.style.width = `min(40%, ${left.clientWidth}px)`;
        if (input !== null) {
          input.style.paddingLeft = `min(40%, ${padLeft + left.clientWidth + padRight}px)`;
        }
      }
    }, 100);
  }

  function padRightSlot() {
    if (right !== null) {
      right.style.right = `${padRight}px`;
      right.style.width = 'min-content';

      if (input !== null) {
        input.style.paddingRight = `min(40%, ${padLeft + padRight}px)`;
      }
      setChildrenStyles([right]);
    }
    // because the content of the slot might not have been fully rendered by the time this function is called
    // we must kick it out to a timeout to wait for it to be rendered
    setTimeout(() => {
      if (right !== null) {
        right.style.right = `${padRight}px`;

        right.style.width = `min(40%, ${right.clientWidth}px)`;
        if (input !== null) {
          input.style.paddingRight = `min(40%, ${padLeft + right.clientWidth + padRight}px)`;
        }
      }
    }, 100);
  }

  function inputObserverCallback(mutations: MutationRecord[]) {
    for (const { attributeName } of mutations) {
      if (attributeName === 'class' || attributeName === 'disabled') {
        setChildrenStyles([left, right].filter(filterEmpty));
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

            if (input?.disabled) {
              i.style.color = 'var(--st-gray-30)';
              i.style.cursor = 'not-allowed';
            }

            if (input?.classList.contains('error')) {
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
    align-items: center;
    cursor: default;
    display: flex;
    height: 100%;
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
    align-items: flex-start;
    display: inherit;
    flex-direction: column;
    gap: 4px;
  }
</style>
