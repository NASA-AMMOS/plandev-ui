<svelte:options immutable={true} />

<script lang="ts">
  export let label: string = '';
  export let username: string = 'Unknown';

  $: usernameFirstChar = username.charAt(0).toLocaleUpperCase();
</script>

<div class="user-badge st-typography-body">
  <div class="user-badge-avatar">
    {usernameFirstChar}
  </div>
  <div class="user-badge-details">
    <div class="user-badge-name">
      {username}
    </div>
    {#if label}
      <div class="user-badge-label">
        {label}
      </div>
    {/if}
  </div>
</div>

<style>
  .user-badge {
    align-items: center;
    color: var(--st-gray-60);
    display: flex;
    gap: 8px;
  }

  .user-badge-avatar {
    align-items: center;
    background: #2f80ed;
    border-radius: 24px;
    color: var(--st-white);
    display: flex;
    flex-shrink: 0;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .user-badge-name {
    color: var(--st-gray-100);
  }

  .user-badge-label {
    color: var(--st-gray-60);
  }
</style>
