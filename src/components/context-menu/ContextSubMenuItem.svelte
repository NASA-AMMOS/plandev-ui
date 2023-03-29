<script lang="ts">
  import ChevronRightIcon from '@nasa-jpl/stellar/icons/chevron_right.svg?component';
  import ContextMenu from './ContextMenu.svelte';
  import ContextMenuItem from './ContextMenuItem.svelte';

  export let text: string = '';
  export let parentMenu: ContextMenu = null;

  let contextMenu: ContextMenu;
  let div: HTMLDivElement;
  let rAFReq;

  function show() {
    if (div && contextMenu) {
      contextMenu.showDirectly(0, 0, 0);
      rAFReq = window.requestAnimationFrame(() => {
        const itemDiv = div.getBoundingClientRect();
        let x = itemDiv.right;
        let y = itemDiv.y;
        contextMenu.showDirectly(x, y, itemDiv.left);
      });
    }
  }

  function hide() {
    contextMenu.hide();
    cancelAnimationFrame(rAFReq);
  }
</script>

<div bind:this={div}>
  <ContextMenuItem on:mouseenter={show} on:mouseleave={hide}>
    <div class="context-sub-menu-item">
      {text}
      <ChevronRightIcon />
    </div>
    <ContextMenu
      bind:this={contextMenu}
      on:hide={() => {
        if (parentMenu) {
          parentMenu.hide();
        }
      }}
    >
      <slot />
    </ContextMenu>
  </ContextMenuItem>
</div>

<style>
  .context-sub-menu-item {
    align-items: center;
    display: flex;
    gap: 4px;
  }
  .context-sub-menu-item :global(svg) {
    height: 12px;
    width: 12px;
  }
</style>
