<script lang="ts">
  import { Button, Command, Select } from '@nasa-jpl/stellar-svelte';
  import AppMenu from '../../components/menus/AppMenu.svelte';

  import type { User, UserRole } from '../../types/app';
  import { getTarget } from '../../utilities/generic';
  import { changeUserRole } from '../../utilities/permissions';

  export let user: User | null;

  let userRoles: UserRole[] = [];

  $: userRoles = user?.allowedRoles ?? [];

  async function changeRole(event: Event) {
    console.log('CHANGR ROLE', event);
    const { value } = getTarget(event);
    if (value) {
      await changeUserRole(value as string);
      window.location.reload();
    }
  }
</script>

<div class="nav">
  <div class="left">
    <AppMenu {user} />
    <div class="divider" />
    <div class="title st-typography-medium">
      <slot name="title" />
    </div>
    <slot name="left" />
  </div>
  <script lang="ts">
    import * as Command from '$lib/components/ui/command';
  </script>
  <Command.Root>
    <Command.Input placeholder="Type a command or search..." />
    <Command.List>
      <Command.Empty>No results found.</Command.Empty>
      <Command.Group heading="Suggestions">
        <Command.Item>Calendar</Command.Item>
        <Command.Item>Search Emoji</Command.Item>
        <Command.Item>Calculator</Command.Item>
      </Command.Group>
      <Command.Separator />
      <Command.Group heading="Settings">
        <Command.Item>Profile</Command.Item>
        <Command.Item>Billing</Command.Item>
        <Command.Item>Settings</Command.Item>
      </Command.Group>
    </Command.List>
  </Command.Root>

  <Button variant="s"></Button>
  <!-- <Avatar.Root>
    <Avatar.Image srcssdf="sdfsdf" el />
  </Avatar.Root> -->
  <div class="right">
    <slot name="right" />
    {#if userRoles.length > 1}
      <!-- <select value={user?.activeRole} class="st-select" on:change={changeRole}>
        {#each userRoles as userRole}
          <option value={userRole}>{userRole}</option>
        {/each}
      </select> -->
      <Select.Root value={user?.activeRole} onValueChange={changeRole}>
        <Select.Trigger class="w-[180px]">
          <Select.Value placeholder="Select a fruit" />
        </Select.Trigger>
        <Select.Content>
          <Select.Group>
            <Select.Label>Fruits</Select.Label>
            {#each userRoles as userRole}
              <Select.Item value={userRole} label={userRole}>{userRole}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
        <Select.Input name="favoriteFruit" />
      </Select.Root>
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
    z-index: 9;
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
  }
</style>
