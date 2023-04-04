<script lang="ts">
  export let borderLeft: boolean = false;
  export let borderRight: boolean = false;
  export let borderTop: boolean = false;
  export let overflowYBody: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto' = 'auto';
  export let padBody: boolean = true;
  export let padHeader: boolean = true;
</script>

<div class="panel" class:border-left={borderLeft} class:border-right={borderRight} class:border-top={borderTop}>
  <div class="header" class:pad-header={padHeader}>
    <slot name="header" />
  </div>

  <div class="body" class:pad-body={padBody} style="overflow-y: {overflowYBody};">
    <slot name="body" />
  </div>
</div>

<style>
  .panel {
    display: grid;
    grid-template-rows: var(--nav-header-height) calc(100% - var(--nav-header-height));
    overflow: hidden;
    width: 100%;
  }

  .header {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    gap: 0.5rem;
    height: var(--nav-header-height);
    justify-content: space-between;
  }

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
