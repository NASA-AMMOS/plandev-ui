<script lang="ts">
  export let borderLeft: boolean = false;
  export let borderRight: boolean = false;
  export let padBody: boolean = true;
  export let padHeader: boolean = true;
</script>

<div class="panel" class:borderLeft class:borderRight>
  <div class="header" class:padHeader>
    <slot name="header" />
  </div>

  <div class="body" class:padBody>
    <slot name="body" />
  </div>
</div>

<style>
  .borderLeft {
    border-left: 1px solid var(--st-gray-20);
  }

  .borderRight {
    border-right: 1px solid var(--st-gray-20);
  }

  .body,
  .panel {
    height: 100%;
  }

  .header {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
    height: 40px;
    width: 100%;
  }

  .padBody,
  .padHeader {
    padding: 0.5rem;
  }
</style>
