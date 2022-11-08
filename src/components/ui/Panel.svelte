<script lang="ts">
  export let borderLeft: boolean = false;
  export let borderRight: boolean = false;
  export let borderTop: boolean = false;
  export let overflowYBody: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto' = 'auto';
  export let padBody: boolean = true;
  export let padHeader: boolean = true;
</script>

<div class="panel" class:borderLeft class:borderRight class:borderTop>
  <div class="header" class:padHeader>
    <slot name="header" />
  </div>

  <div class="body" class:padBody style="overflow-y: {overflowYBody};">
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

  .padBody,
  .padHeader {
    padding: 0.5rem;
  }

  .borderLeft {
    border-left: 1px solid var(--st-gray-20);
  }

  .borderRight {
    border-right: 1px solid var(--st-gray-20);
  }

  .borderTop {
    border-top: 1px solid var(--st-gray-20);
  }
</style>
