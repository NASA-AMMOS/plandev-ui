<svelte:options immutable={true} />

<script lang="ts">
  import ActivityDirectiveIconSVG from '@nasa-jpl/stellar/icons/activity_directive.svg?component';

  export let label: string = undefined;
  export let backgroundColor: string = '#fcbd21';
  export let color: string = '#000000';
</script>

<div class="container">
  <div class="directive-icon-container">
    <div class="directive-background" style="background-color: {backgroundColor};" />
    <div class="directive-icon" style="color: {color};"><ActivityDirectiveIconSVG /></div>
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
