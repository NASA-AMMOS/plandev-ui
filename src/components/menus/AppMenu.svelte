<svelte:options accessors={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import { Button, Popover } from '@nasa-jpl/stellar-svelte';
  import {
    Archive,
    BookA,
    BookOpen,
    Boxes,
    BugPlay,
    CalendarRange,
    ChevronDown,
    ChevronsLeftRight,
    Clipboard,
    FileBox,
    FileCode2,
    FlipHorizontal2,
    Info,
    LogOut,
    Network,
    Tags,
  } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import AerieWordmarkDark from '../../assets/aerie-wordmark-dark.svg?component';
  import { SEQUENCE_EXPANSION_MODE } from '../../constants/command-expansion';
  import { SequencingMode } from '../../enums/sequencing';
  import type { User, Version } from '../../types/app';
  import effects from '../../utilities/effects';
  import { logout } from '../../utilities/login';
  import { showAboutModal } from '../../utilities/modal';
  import MenuItem from './MenuItem.svelte';
  import MenuLink from './MenuLink.svelte';

  export let user: User | null = null;
  let isOpen = false;
  let version: Version = {
    branch: 'unknown',
    commit: 'unknown',
    commitUrl: '',
    date: new Date().toLocaleString(),
    name: 'aerie-ui',
  };

  onMount(async () => {
    version = await effects.getVersion();
  });

  function closeMenu() {
    isOpen = false;
  }
</script>

<div class="relative -ml-2 flex cursor-pointer items-center justify-center gap-1" role="none">
  <Popover.Root bind:open={isOpen}>
    <Popover.Trigger asChild let:builder>
      <Button
        builders={[builder]}
        variant="ghost"
        size="lg"
        class="flex gap-2 bg-[#110D3D] px-2 hover:bg-primary/30 dark:bg-secondary"
        aria-label="Open Main Menu"
      >
        <AerieWordmarkDark />
        <ChevronDown strokeWidth={2} size={16} class="text-white" />
      </Button>
    </Popover.Trigger>
    <Popover.Content class="w-[580px] p-0" role="menu" aria-label="Main Menu">
      <div class="grid grid-cols-3 gap-0.5 px-0.5 pt-1">
        <!-- Planning Column -->
        <div class="flex flex-col gap-0.5">
          <h3 class="px-3 pb-2 pt-2 text-sm font-medium text-muted-foreground">Planning</h3>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/plans">
            <Clipboard size={16} />
            Plans
          </MenuLink>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/models">
            <FileBox size={16} />
            Models
          </MenuLink>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/constraints">
            <FlipHorizontal2 size={16} />
            Constraints
          </MenuLink>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/scheduling">
            <CalendarRange size={16} />
            Scheduling
          </MenuLink>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/tags">
            <Tags size={16} />
            Tags
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/external-sources">
            <Boxes size={16} />
            External Sources
          </MenuLink>
        </div>

        <!-- Sequencing Column -->
        <div class="flex flex-col gap-0.5">
          <h3 class="px-3 pb-2 pt-2 text-sm font-medium text-muted-foreground">Sequencing</h3>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/sequencing">
            <FileCode2 size={16} />
            Sequence Editor
          </MenuLink>
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/dictionaries">
            <BookA size={16} />
            Dictionaries
          </MenuLink>
          {#if SEQUENCE_EXPANSION_MODE === SequencingMode.TYPESCRIPT}
            <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/expansion/rules">
              <ChevronsLeftRight size={16} />
              Expansion
            </MenuLink>
          {/if}
          {#if SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING}
            <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/sequence-templates">
              <ChevronsLeftRight size={16} />
              Sequence Templates
            </MenuLink>
          {/if}
          <MenuLink on:click={closeMenu} className="text-sm py-1.5" href="{base}/parcels">
            <Archive size={16} />
            Parcels
          </MenuLink>
        </div>

        <!-- Resources Column -->
        <div class="flex flex-col gap-0.5">
          <h3 class="px-3 pb-2 pt-2 text-sm font-medium text-muted-foreground">Resources</h3>
          <MenuLink
            on:click={closeMenu}
            target="_blank"
            className="text-sm py-1.5"
            href="https://nasa-ammos.github.io/aerie-docs/"
          >
            <BookOpen size={16} />
            Documentation
          </MenuLink>
          <MenuLink
            on:click={closeMenu}
            target="_blank"
            className="text-sm py-1.5"
            href={env.PUBLIC_GATEWAY_CLIENT_URL}
          >
            <Network size={16} />
            Gateway
          </MenuLink>
          <MenuLink
            on:click={closeMenu}
            target="_blank"
            className="text-sm py-1.5"
            href="{env.PUBLIC_GATEWAY_CLIENT_URL}/api-playground"
          >
            <BugPlay size={16} />
            GraphQL Playground
          </MenuLink>
          <MenuItem
            className="text-sm py-1.5"
            on:click={e => {
              e.stopPropagation();
              isOpen = false;
              showAboutModal();
            }}
          >
            <Info size={16} />
            About
          </MenuItem>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 flex items-center justify-between border-t border-border bg-secondary px-2 py-1">
        <div class="text-sm text-muted-foreground">
          {#if user}
            <div class="flex items-center gap-2 text-xs">
              Logged in as: {user.id}
              <Button class="flex items-center gap-1" variant="outline" size="sm" on:click={() => logout()}>
                <LogOut size={12} />
                Logout
              </Button>
            </div>
          {:else}
            Logged out
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">{version.name}</span>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
