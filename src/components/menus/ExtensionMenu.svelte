<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { Extension } from '../../types/extension';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import PlanNavButton from '../plan/PlanNavButton.svelte';
  import MenuItem from './MenuItem.svelte';

  export let extensions: Extension[];
  export let title: string;
  export let user: User | null;

  const DESCRIPTION_MAX_LENGTH = 50;
  const dispatch = createEventDispatcher<{
    callExtension: Extension;
  }>();

  function callExtension(extension: Extension) {
    dispatch('callExtension', extension);
  }

  function formatDescription(description: string): string {
    // Truncate the description at DESCRIPTION_MAX_LENGTH and add ellipsis.
    if (description !== null && description.length > DESCRIPTION_MAX_LENGTH) {
      return `${description.substring(0, Math.min(description.length, DESCRIPTION_MAX_LENGTH))}...`;
    } else if (description?.length < DESCRIPTION_MAX_LENGTH) {
      return description;
    }

    return '';
  }

  function hasExtensionPermission(extension: Extension): boolean {
    for (const extensionRole of extension.extension_roles) {
      if (user?.activeRole === extensionRole.role) {
        return true;
      }
    }

    return false;
  }
</script>

{#if extensions.length > 0}
  <div class="extension-menu st-typography-medium">
    <PlanNavButton {title} menuTitle="Extensions">
      <SettingsIcon />
      <div class="st-typography-medium" slot="menu">
        {#each extensions as extension}
          <MenuItem
            on:click={() => callExtension(extension)}
            use={[
              [
                permissionHandler,
                {
                  hasPermission: hasExtensionPermission(extension),
                  permissionError: 'You do not have permission to call this extension',
                },
              ],
            ]}
          >
            <div class="extension-menu--menu-item">
              {extension.label}
              <span class="st-typography-label">{formatDescription(extension.description)}</span>
            </div>
          </MenuItem>
        {/each}
      </div>
    </PlanNavButton>
  </div>
{/if}

<style>
  .extension-menu {
    --aerie-menu-item-template-columns: auto;
    align-items: center;
    cursor: pointer;
    display: grid;
    height: inherit;
    justify-content: center;
    position: relative;
  }

  .extension-menu--menu-item {
    display: flex;
    flex-direction: column;
  }
</style>
