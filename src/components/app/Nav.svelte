<script lang="ts">
  import { Select, ThemeSwitcherButton } from '@nasa-jpl/stellar-svelte';
  import AppMenu from '../../components/menus/AppMenu.svelte';
  import type { User, UserRole } from '../../types/app';
  import { changeUserRole } from '../../utilities/permissions';

  export let user: User | null;

  let userRoles: UserRole[] = [];

  $: userRoles = user?.allowedRoles ?? [];

  async function changeRole(value: string) {
    await changeUserRole(value as string);
    window.location.reload();
  }
</script>

<div class="px-4 bg-primary dark:bg-secondary flex h-12 w-100 items-center">
  <div class="flex gap-2 items-center flex-1">
    <AppMenu {user} />
    <div class="bg-white w-[1px] h-4 opacity-20" />
    <div class="text-sm text-white font-medium">
      <slot name="title" />
    </div>
    <slot name="left" />
  </div>

  <div class="items-center inline-flex gap-1">
    <slot name="right" />
    {#if userRoles.length > 1}
      <Select.Root
        selected={{ label: user?.activeRole ?? '', value: user?.activeRole ?? '' }}
        onSelectedChange={v => v && changeRole(v.value)}
      >
        <Select.Trigger class="w-[200px]" value={user?.activeRole} size="xs">
          <Select.Value placeholder="Select a" class="text-secondary-foreground" />
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
    <div class="dark:text-white">
      <ThemeSwitcherButton />
    </div>
  </div>
</div>

<style>
  :root {
    --nav-header-height: 48px;
  }
</style>
