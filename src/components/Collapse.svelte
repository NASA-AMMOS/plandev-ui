<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import { classNames } from '../utilities/generic';
  import { tooltip } from '../utilities/tooltip';
  import ContextMenu from './context-menu/ContextMenu.svelte';

  export let className: string = '';
  export let collapsible: boolean = true;
  export let defaultExpanded: boolean = true;
  export let error: boolean = false;
  export let padContent: boolean = true;
  export let title: string = '';
  export let titleClassName: string = '';
  export let tooltipContent: string = '';

  let contextMenu: ContextMenu;

  $: collapseClasses = classNames('collapse', {
    [className]: !!className,
    'has-context-menu': !!$$slots.contextMenuContent,
  });
  $: titleClasses = classNames('title', { [titleClassName]: !!titleClassName });
  $: expanded = defaultExpanded;
</script>

<div class={collapseClasses} class:error role="group">
  <button
    on:contextmenu|preventDefault={contextMenu?.show}
    tabindex={!collapsible ? -1 : 0}
    class="collapse-header st-button st-typography-medium tertiary"
    class:static={!collapsible}
    class:expanded
    on:click={() => {
      if (collapsible) {
        expanded = !expanded;
      }
    }}
  >
    {#if collapsible}
      <div class="collapse-icon">
        {#if expanded}
          <CaretDownIcon />
        {:else}
          <CaretRightIcon />
        {/if}
      </div>
    {/if}
    <div class="left">
      <slot name="left" />
    </div>
    <div class={titleClasses} use:tooltip={{ content: tooltipContent, placement: 'top' }}>
      {title}
    </div>
    <div class="right">
      <slot name="right" />
    </div>
  </button>
  <div class="content" class:pad-content={padContent} class:expanded aria-hidden={collapsible ? !expanded : false}>
    <slot />
  </div>
</div>

{#if $$slots.contextMenuContent}
  <ContextMenu bind:this={contextMenu}>
    <slot name="contextMenuContent" />
  </ContextMenu>
{/if}

<style>
  .collapse {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .collapse > .collapse-header {
    display: flex;
    flex-direction: row;
    gap: 3px;
    height: 32px;
    justify-content: flex-start;
    padding: 8px 0px 8px 0px;
  }

  .collapse > .collapse-header:hover {
    background: none;
  }

  .collapse > .collapse-header.static {
    cursor: default;
  }

  .collapse.error .title,
  .collapse.error .icon :global(svg) {
    color: var(--st-red);
  }

  .collapse.has-context-menu > button {
    cursor: context-menu !important;
  }

  .collapse-icon {
    flex-shrink: 0;
    height: 9px;
    margin-right: 2px;
    overflow: hidden;
    width: 9px;
  }

  .collapse-icon :global(svg) {
    color: var(--st-typography-medium-color);
    margin-left: -4px;
    margin-top: -4px;
  }

  .title {
    color: var(--st-typography-medium-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    height: 0;
    overflow: hidden;
    visibility: hidden;
    width: 0;
  }

  .content.pad-content {
    margin-left: 32px;
  }

  .expanded {
    height: auto;
    visibility: visible;
    width: auto;
  }

  .left {
    flex-shrink: 0;
  }

  .right {
    display: flex;
    flex: 1;
    justify-content: flex-end;
  }
</style>
