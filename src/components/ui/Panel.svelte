<script lang="ts">
  export let borderLeft: boolean = false;
  export let borderRight: boolean = false;
  export let overflowYBody: 'visible' | 'hidden' | 'clip' | 'scroll' | 'auto' = 'scroll';
  export let padBody: boolean = true;
  export let padHeader: boolean = true;
</script>

<div class="panel" class:borderLeft class:borderRight>
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
    grid-template-rows: 40px 100%;
    height: 100%;
    overflow: hidden;
    width: 100%;
  }

  .header {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .body {
    height: calc(100% - 40px);
  }

  .header :global(i) {
    font-size: 1rem;
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
</style>
