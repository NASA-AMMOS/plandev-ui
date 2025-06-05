<script lang="ts">
  import { Collapsible } from '@nasa-jpl/stellar-svelte';
  import { ChevronRight, File, Folder } from 'lucide-svelte';
  import * as Sidebar from './sidebar-evaluation/index.js';

  export let item: string | any[];

  $: [name, ...items] = Array.isArray(item) ? item : [item];
  $: isFolder = items.length > 0;

  let isOpen = name === 'lib' || name === 'components';
</script>

{#if !isFolder}
  <Sidebar.MenuItem>
    <Sidebar.MenuButton isActive={name === 'button.svelte'} className="data-[active=true]:bg-transparent">
      <File size={16} />
      {name}
    </Sidebar.MenuButton>
  </Sidebar.MenuItem>
{:else}
  <Sidebar.MenuItem>
    <Collapsible.Root bind:open={isOpen}>
      <Collapsible.Trigger>
        <Sidebar.MenuButton>
          <ChevronRight size={16} class="transition-transform {isOpen ? 'rotate-90' : ''}" />
          <Folder size={16} />
          {name}
        </Sidebar.MenuButton>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Sidebar.MenuSub>
          {#each items as subItem, index (index)}
            <svelte:self item={subItem} />
          {/each}
        </Sidebar.MenuSub>
      </Collapsible.Content>
    </Collapsible.Root>
  </Sidebar.MenuItem>
{/if}
