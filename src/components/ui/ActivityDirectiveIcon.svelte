<svelte:options immutable={true} />

<script lang="ts">
  import ActivityDirectiveIconSVG from '@nasa-jpl/stellar/icons/activity_directive.svg?component';

  export let backgroundColor: string | undefined = undefined;
  export let color: string | undefined = undefined;
  export let label: string | undefined = undefined;
  export let opacity: number = 1;
  export let size: string | undefined = '16px';
</script>

<div class="container">
  <div class="directive-icon-container">
    <div
      class="directive-icon"
      style="background-color: {backgroundColor ?? '#fcbd21'};color: {color ?? '#000000'};opacity: {opacity}"
    >
      <ActivityDirectiveIconSVG width={size} height={size} />
    </div>
  </div>
  {#if label}
    <span class="icon-label">{label}</span>
  {/if}
</div>

<style>
  .container {
    align-items: center;
    column-gap: 5px;
    display: inline-flex;
  }

  .directive-icon {
    background-color: #fcbd21;
    border: 1px solid rgba(0, 0, 0, 0.24);
    border-radius: 1px 33px 33px 1px;
    display: flex;
  }

  .icon-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
