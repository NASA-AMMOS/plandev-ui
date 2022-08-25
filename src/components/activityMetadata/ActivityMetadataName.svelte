<svelte:options immutable={true} />

<script lang="ts">
  export let key: string;
</script>

<div class="activity-metadata-name">
  <div class="name">
    {key}
  </div>
</div>

<style>
  .activity-metadata-name {
    align-items: center;
    display: flex;
  }

  .name {
    color: var(--st-gray-80);
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
