<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import AppMenu from '../../components/menus/AppMenu.svelte';
  import type { User, UserRole } from '../../types/app';
  import { getTarget } from '../../utilities/generic';
  import { changeUserRole } from '../../utilities/permissions';

  export let user: User | null;

  let userRoles: UserRole[] = [];

  $: userRoles = user?.allowedRoles ?? [];

  async function changeRole(event: Event) {
    const { value } = getTarget(event);
    if (value) {
      await changeUserRole(value as string);
      await invalidateAll();
    }
  }
</script>

<div class="nav">
  <div class="left">
    <AppMenu />
    <div class="divider" />
    <div class="title st-typography-medium">
      <slot name="title" />
    </div>
    <slot name="left" />
  </div>
  <div class="right">
    <slot name="right" />
    {#if userRoles.length > 1}
      <select value={user?.activeRole} class="st-select" on:change={changeRole}>
        {#each userRoles as userRole}
          <option value={userRole}>{userRole}</option>
        {/each}
      </select>
    {/if}
  </div>
</div>

<style>
  :root {
    --nav-header-height: 48px;
  }
  .nav {
    align-items: center;
    background: #110d3e;
    color: var(--st-primary-background-color);
    display: flex;
    height: var(--nav-header-height);
    padding: 1rem;
    z-index: 2;
  }

  .divider {
    background: var(--st-white);
    height: 16px;
    opacity: 0.2;
    width: 1px;
  }

  .title {
    align-items: center;
    color: var(--st-gray-20);
    font-size: 14px;
  }

  .left {
    align-items: center;
    display: flex;
    flex-grow: 1;
    gap: 10px;
  }

  .right {
    align-items: center;
    display: inline-flex;
    gap: 10px;
  }
</style>
