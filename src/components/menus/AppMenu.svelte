<svelte:options accessors={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import { env } from '$env/dynamic/public';
  import { Button, Popover } from '@nasa-jpl/stellar-svelte';
  import CalendarIcon from '@nasa-jpl/stellar/icons/calendar.svg?component';
  import GraphQLIcon from '@nasa-jpl/stellar/icons/graphql.svg?component';
  import PlanIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
  import TagIcon from '@nasa-jpl/stellar/icons/tag.svg?component';
  import ArchiveIcon from 'bootstrap-icons/icons/archive.svg?component';
  import BarChartIcon from 'bootstrap-icons/icons/bar-chart.svg?component';
  import BoxArrowRightIcon from 'bootstrap-icons/icons/box-arrow-right.svg?component';
  import BracesAsteriskIcon from 'bootstrap-icons/icons/braces-asterisk.svg?component';
  import CodeSquareIcon from 'bootstrap-icons/icons/code-square.svg?component';
  import DiagramIcon from 'bootstrap-icons/icons/diagram-3.svg?component';
  import InfoCircleIcon from 'bootstrap-icons/icons/info-circle.svg?component';
  import JournalCodeIcon from 'bootstrap-icons/icons/journal-code.svg?component';
  import JournalTextIcon from 'bootstrap-icons/icons/journal-text.svg?component';
  import JournalsIcon from 'bootstrap-icons/icons/journals.svg?component';
  import { ChevronDown } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import AerieWordmarkDark from '../../assets/aerie-wordmark-dark.svg?component';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import { SEQUENCE_EXPANSION_MODE } from '../../constants/command-expansion';
  import { SequencingMode } from '../../enums/sequencing';
  import type { User } from '../../types/app';
  import type { User, Version } from '../../types/app';
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
    const versionResponse = await fetch(`${base}/version.json`);
    version = await versionResponse.json();
  });
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
          <MenuLink className="text-sm py-1.5" href="${base}/plans">
            <PlanIcon />
            Plans
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/models">
            <BarChartIcon />
            Models
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/constraints">
            <BracesAsteriskIcon />
            Constraints
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/scheduling">
            <CalendarIcon />
            Scheduling
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="${base}/tags">
            <TagIcon />
            Tags
          </MenuLink>
        </div>

        <!-- Sequencing Column -->
        <div class="flex flex-col gap-0.5">
          <h3 class="px-3 pb-2 pt-2 text-sm font-medium text-muted-foreground">Sequencing</h3>
          <MenuLink className="text-sm py-1.5" href="{base}/sequencing">
            <JournalCodeIcon />
            Sequence Editor
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/dictionaries">
            <JournalTextIcon />
            Dictionaries
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/expansion/rules">
            <CodeSquareIcon />
            Expansion
          </MenuLink>
          <MenuLink className="text-sm py-1.5" href="{base}/parcels">
            <ArchiveIcon />
            Parcels
          </MenuLink>
        </div>

        <!-- Resources Column -->
        <div class="flex flex-col gap-0.5">
          <h3 class="px-3 pb-2 pt-2 text-sm font-medium text-muted-foreground">Resources</h3>
          <MenuLink target="_blank" className="text-sm py-1.5" href="https://nasa-ammos.github.io/aerie-docs/">
            <JournalsIcon />
            Documentation
          </MenuLink>
          <MenuLink target="_blank" className="text-sm py-1.5" href={env.PUBLIC_GATEWAY_CLIENT_URL}>
            <DiagramIcon />
            Gateway
          </MenuLink>
          <MenuLink target="_blank" className="text-sm py-1.5" href="{env.PUBLIC_GATEWAY_CLIENT_URL}/api-playground">
            <GraphQLIcon />
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
            <InfoCircleIcon />
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
              <Button class="flex items-center gap-2" variant="outline" size="sm" on:click={() => logout()}>
                <BoxArrowRightIcon />
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
