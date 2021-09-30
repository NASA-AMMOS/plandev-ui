<script lang="ts">
  export let hideFooter: boolean = false;
  export let hideHeader: boolean = false;
</script>

<div class="panel">
  {#if !hideHeader}
    <div class="header p-1 mb-1">
      <slot name="header" />
    </div>
  {/if}
  <div class="body">
    <slot name="body" />
  </div>
  {#if !hideFooter}
    <div class="footer">
      <slot name="footer" />
    </div>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    height: 100%;
    width: 100%;
  }

  .panel > .header {
    box-shadow: 0px 0 5px 0px rgb(0 0 0 / 20%);
    font-size: 0.8rem;
  }

  .panel > .body {
    flex-grow: 1;
    overflow: auto;
  }

  .panel > .footer {
    align-items: center;
    box-shadow: 0px 0 5px 0px rgb(0 0 0 / 20%);
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    padding: 1rem;
  }

  .panel > .footer > :global(span) {
    display: grid;
    gap: 1rem;
    grid-template-columns: auto auto;
  }
</style>
