<svelte:options immutable={true} />

<script lang="ts">
  import UserBadge from '../ui/UserBadge.svelte';

  export let label: string = '';
  export let title: string = '';
  export let username: string = '';
</script>

<div class="plan-merge-review-user-info">
  <div class="st-typography-medium">
    {title}
  </div>
  <UserBadge {label} {username} />
</div>

<style>
  .plan-merge-review-user-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
