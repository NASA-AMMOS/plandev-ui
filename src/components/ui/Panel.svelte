<script lang="ts">
  import { classNames } from '../../utilities/generic';

  export let borderLeft: boolean = false;
  export let borderRight: boolean = false;
  export let borderTop: boolean = false;
  export let overflowYBody: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto' = 'auto';
  export let padBody: boolean = true;
  export let padHeader: boolean = true;

  const panelClasses = classNames('grid min-h-20 min-w-20 overflow-hidden w-full', {
    'border-l': borderLeft,
    'border-r': borderRight,
    'border-t': borderTop,
  });
</script>

<div
  class={panelClasses}
  style:grid-template-rows="var(--nav-header-height) calc(100% - var(--nav-header-height))"
  role="tabpanel"
>
  <div
    class="flex h-[--nav-header-height] items-center justify-between gap-2 overflow-hidden border-b"
    class:pad-header={padHeader}
  >
    <slot name="header" />
  </div>

  <div class="body" class:pad-body={padBody} style="overflow-y: {overflowYBody};">
    <slot name="body" />
  </div>
</div>

<style>
  .header :global(i) {
    font-size: 1rem;
  }

  .body {
    display: flex;
    flex-direction: column;
  }

  .pad-body,
  .pad-header {
    padding: 0.5rem;
  }

  .border-left {
    border-left: 1px solid var(--st-gray-20);
  }

  .border-right {
    border-right: 1px solid var(--st-gray-20);
  }

  .border-top {
    border-top: 1px solid var(--st-gray-20);
  }
</style>
