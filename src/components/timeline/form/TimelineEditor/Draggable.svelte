<svelte:options immutable={true} />

<script lang="ts">
  import { draggable, type DragOptions } from '@neodrag/svelte';
  import Resizable from './Resizable.svelte';

  export let dragOptions: DragOptions = {};
  export let className: string = '';
  export let initialWidth: number = 500;
  export let initialHeight: number = 500;

  let rootRef: HTMLDivElement;

  const marginTransform = ({
    offsetX,
    offsetY,
    rootNode,
  }: {
    offsetX: number;
    offsetY: number;
    rootNode: HTMLElement;
  }) => {
    rootNode.style.marginLeft = `${offsetX}px`;
    rootNode.style.marginTop = `${offsetY}px`;
  };
</script>

<div
  bind:this={rootRef}
  use:draggable={{
    bounds: 'body',
    cancel: '.cancel-drag',
    handle: $$slots.handle ? '.handle' : undefined,
    transform: marginTransform,
    ...dragOptions,
  }}
  class="root"
  role="dialog"
>
  <Resizable {className} width={initialWidth} height={initialHeight}>
    <div class="handle">
      <slot name="handle" />
    </div>
    <slot />
  </Resizable>
</div>

<style>
  .root {
    left: 0%;
    position: fixed;
    top: 0%;
    z-index: 9999;
  }

  .handle {
    cursor: move;
  }
</style>
