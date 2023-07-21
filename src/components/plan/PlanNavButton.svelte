<script lang="ts">
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import type { Status } from '../../utilities/status';
  import { tooltip } from '../../utilities/tooltip';
  import Menu from '../menus/Menu.svelte';
  import MenuHeader from '../menus/MenuHeader.svelte';
  import StatusBadge from '../ui/StatusBadge.svelte';

  export let buttonText: string = '';
  export let buttonTooltipContent: string = '';
  export let disabled: boolean = false;
  export let hasPermission: boolean = true;
  export let menuTitle: string = '';
  export let permissionError: string | undefined = undefined;
  export let status: Status | null = null;
  export let statusText: string = '';
  export let title: string;

  let menu: Menu;
</script>

<div
  class="nav-button st-typography-medium"
  role="none"
  on:mouseenter={() => menu.show()}
  on:mouseleave={() => menu.hide()}
>
  <div class="nav-button-icon-container">
    <slot />
    <span class="nav-button-status">
      {#if status}
        <StatusBadge {status} showTooltip={false} />
      {/if}
    </span>
  </div>
  {#if title}
    <div class="nav-button-title">
      {title}
    </div>
  {/if}
  <Menu bind:this={menu} hideAfterClick={false} placement="bottom-start" offset={[0, 0]}>
    {#if menuTitle}
      <MenuHeader title={menuTitle} showBorder={false} />
    {/if}
    <div class="menu-body">
      {#if status}
        <div class="status-row st-typography-body">
          <StatusBadge {status} showTooltip={false} />
          {statusText || status}
        </div>
      {/if}
      <div class="menu-metadata st-typography-body">
        <slot name="metadata" />
      </div>

      {#if buttonText}
        <div use:tooltip={{ content: buttonTooltipContent, placement: 'bottom' }}>
          <button
            class="st-button secondary"
            {disabled}
            on:click
            use:permissionHandler={{
              hasPermission,
              permissionError,
            }}
          >
            <PlayIcon />
            {buttonText}
          </button>
        </div>
      {/if}
    </div>
    <slot name="menu" />
  </Menu>
</div>

<style>
  .nav-button {
    align-items: center;
    color: var(--st-gray-20);
    cursor: pointer;
    display: inline-flex;
    font-size: 14px;
    height: var(--nav-header-height);
    letter-spacing: 0.14px;
    line-height: 14px;
    padding: 16px;
    position: relative;
    user-select: none;
    white-space: nowrap;
  }

  .nav-button:hover {
    background: #2c2850;
  }

  .nav-button:hover :global(.nav-button-status .status-badge.failed) {
    filter: drop-shadow(3px 0px 0px #2c2850);
  }

  .nav-button-title {
    margin-left: 12px;
  }

  .nav-button-icon-container {
    position: relative;
  }

  .nav-button-icon-container :global(.st-icon) {
    height: 20px;
    width: 20px;
  }

  .nav-button .nav-button-status {
    position: absolute;
    right: -8px;
    top: -8px;
  }

  .nav-button :global(.header) {
    padding-bottom: 0;
  }

  .nav-button :global(.nav-button-status .status-badge.failed) {
    filter: drop-shadow(3px 0px 0px #110d3e);
  }

  .menu-body {
    cursor: auto;
    display: grid;
    gap: 8px;
    max-height: 376px;
    overflow: auto;
    padding: 8px;
    text-align: left;
  }

  .menu-body button {
    gap: 4px;
    width: 100%;
  }

  .status-row {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .menu-metadata {
    color: var(--st-gray-50);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
