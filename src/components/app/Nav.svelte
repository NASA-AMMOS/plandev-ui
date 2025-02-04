<script lang="ts">
  import { Button, Command, Select, ThemeSwitcherButton } from '@nasa-jpl/stellar-svelte';
  import { Expand, Goal, Scale, SquarePlay } from 'lucide-svelte';
  import { onMount } from 'svelte';
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
  let open = false;
  onMount(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open = !open;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
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

  <Command.Dialog bind:open>
    <Command.Input placeholder="Type a command or search..." />
    <Command.List>
      <Command.Empty>No results found.</Command.Empty>
      <Command.Group heading="Suggestions">
        <Command.Item><Expand class="mr-2 h-1 w-1" /> <span>Expansion: Expand Activities</span></Command.Item>
        <Command.Item><Scale class="mr-2 h-1 w-1" /> <span>Constraints: Check Constraints</span></Command.Item>
        <Command.Item><Scale class="mr-2 h-1 w-1" /> <span>Constraints: Manage Constraints</span></Command.Item>
      </Command.Group>
      <Command.Separator />
      <Command.Group heading="Simulation">
        <Command.Item><SquarePlay class="mr-2 h-1 w-1" /> <span>Simulation: Run Simulation</span></Command.Item>
      </Command.Group>
      <Command.Group heading="Scheduling">
        <Command.Item><Goal class="mr-2 h-1 w-1" /> <span>Scheduling: Run Scheduling</span></Command.Item>
        <Command.Item><Goal class="mr-2 h-1 w-1" /> <span>Scheduling: Analyze Goal Satisfaction</span></Command.Item>
      </Command.Group>
      <Command.Group heading="Settings">
        <Command.Item>Logout</Command.Item>
        <Command.Item>Switch Role</Command.Item>
      </Command.Group>
    </Command.List>
  </Command.Dialog>

  <div class="text-secondary-foreground flex items-center gap-2 mr-2">
    <p class="text-muted-foreground text-sm bg-secondary px-2 py-1 rounded">
      Press
      <kbd
        class="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100"
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </p>
    <ThemeSwitcherButton />
    <Button variant="secondary">Test</Button>
  </div>

  <div class="right">
    <slot name="right" />
    {#if userRoles.length > 1}
      <!-- <select value={user?.activeRole} class="st-select" on:change={changeRole}>
        {#each userRoles as userRole}
          <option value={userRole}>{userRole}</option>
        {/each}
      </select> -->
      <Select.Root
        selected={{ label: user?.activeRole ?? '', value: user?.activeRole ?? '' }}
        onSelectedChange={v => v && changeRole(v.value)}
      >
        <Select.Trigger class="w-[180px]" value={user?.activeRole}>
          <Select.Value placeholder="Select a fruit" class="text-secondary-foreground" />
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
