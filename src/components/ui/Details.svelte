<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';

  export { className as class };
  export { styleName as style };
  export let open: boolean = true;

  let className: string = '';
  let styleName: string = '';
</script>

<div class={className} style={styleName}>
  <div class="summary p-1" on:click|stopPropagation={() => (open = !open)}>
    <span style:display="flex">
      {#if !open}
        <ChevronRightIcon />
      {:else}
        <ChevronDownIcon />
      {/if}
      <slot name="summary-left" />
    </span>
    <span>
      <slot name="summary-right" />
    </span>
  </div>

  {#if open}
    <slot />
  {/if}
</div>

<style>
  .summary {
    align-items: center;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    user-select: none;
  }
</style>
