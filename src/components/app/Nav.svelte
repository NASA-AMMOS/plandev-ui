<script lang="ts">
  import { Select } from '@nasa-jpl/stellar-svelte';
  import type { User, UserRole } from '../../types/app';
  import { changeUserRole } from '../../utilities/permissions';
  import AppMenu from '../menus/AppMenu.svelte';

  export let user: User | null;

  let userRoles: UserRole[] = [];

  $: userRoles = user?.allowedRoles ?? [];

  async function changeRole(value: string) {
    await changeUserRole(value as string);
    window.location.reload();
  }
</script>

<div class="w-100 flex h-12 items-center bg-[#110D3D] px-4 dark:bg-secondary" role="navigation">
  <div class="flex flex-1 items-center gap-2">
    <AppMenu {user} />
    <div class="h-4 w-[1px] bg-white opacity-20" />
    <div class="text-sm font-medium text-white">
      <slot name="title" />
    </div>
    <slot name="left" />
  </div>

  <div class="inline-flex items-center gap-1">
    <slot name="right" />
    {#if userRoles.length > 1}
      <Select.Root
        selected={{ label: user?.activeRole ?? '', value: user?.activeRole ?? '' }}
        onSelectedChange={v => v && changeRole(v.value)}
      >
        <Select.Trigger class="w-[200px]" value={user?.activeRole} size="xs">
          <Select.Value placeholder="Select a" class="text-secondary-foreground" aria-label="Select Role" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label size="xs">Select Role</Select.Label>
            {#each userRoles as userRole}
              <Select.Item size="xs" value={userRole} label={userRole}>{userRole}</Select.Item>
            {/each}
          </Select.Group>
          <Select.Separator />
          <Select.Label size="xs" class="font-normal text-muted-foreground">
            Logged in as {user?.id || 'Unknown'}
          </Select.Label>
        </Select.Content>
        <Select.Input name="user-menu" />
      </Select.Root>
    {/if}
  </div>
</div>

<style>
  :root {
    --nav-header-height: 48px;
  }
</style>
