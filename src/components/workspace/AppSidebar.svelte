<script lang="ts">
  import { Button, DropdownMenu, Tooltip } from '@nasa-jpl/stellar-svelte';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import {
    ArrowUpFromLine,
    ChevronDown,
    Clapperboard,
    File,
    FilePlus,
    FolderPlus,
    FolderTree,
    Menu,
    RefreshCcw,
  } from 'lucide-svelte';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import * as Sidebar from '../sidebar-evaluation/index.js';
  import TreeNode from '../TreeNode.svelte';
  import TreeNodeReal from '../TreeNodeReal.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let ref: HTMLDivElement | null = null;
  export let onNewFolder: (() => void) | undefined = undefined;
  export let onNewSequence: (() => void) | undefined = undefined;
  export let refreshWorkspaceContents: (() => void) | undefined = undefined;
  export let workspaceTree: WorkspaceTreeNode | null | undefined = undefined;

  // todo
  // 1. way to programmatically open a folder / tree node
  // 2. Swap icons based on file type
  // 3. resizable sidebar
  // 4. fix expand / collapse
  // 5. figure out how open file works
  // 6. do later / future
  // 7. look at the left sidebar nav?

  // This is sample data.
  const data = {
    changes: [
      {
        file: 'README.md',
        state: 'M',
      },
      {
        file: 'routes/+page.svelte',
        state: 'U',
      },
      {
        file: 'routes/+layout.svelte',
        state: 'M',
      },
    ],
    tree: [
      ['lib', ['components', 'button.svelte', 'card.svelte'], 'utils.ts'],
      ['routes', ['hello', '+page.svelte', '+page.ts'], '+page.svelte', '+page.server.ts', '+layout.svelte'],
      ['static', 'favicon.ico', 'svelte.svg'],
      'eslint.config.js',
      '.gitignore',
      'svelte.config.js',
      'tailwind.config.js',
      'package.json',
      'README.md',
    ],
  };
</script>

<Sidebar.Root bind:ref>
  <Sidebar.Header>
    <div class="flex h-16 w-full items-center gap-1">
      <Sidebar.Trigger className="-ml-1">
        <Menu size={16} />
      </Sidebar.Trigger>
      <div class="flex items-center gap-2">
        <SectionTitle>Workspace</SectionTitle>
        <div class="flex gap-1">
          <Button variant="outline" class="gap-1">
            <Clapperboard size={16} />
            Actions
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild let:builder>
              <Button builders={[builder]} variant="outline" class="gap-1">
                <PlusIcon size={16} />
                New
                <ChevronDown size={16} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-56">
              <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewSequence}>
                <FilePlus size={16} />New Sequence
              </DropdownMenu.Item>
              <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewFolder}>
                <FolderPlus size={16} />New Folder
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item class="cursor-pointer gap-1"
                ><ArrowUpFromLine size={16} />Import File</DropdownMenu.Item
              >
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <Button variant="outline">
            <FolderTree size={16} />
          </Button>
          <Tooltip.Root>
            <Tooltip.Trigger asChild let:builder>
              <Button builders={[builder]} variant="outline" on:click={refreshWorkspaceContents}>
                <RefreshCcw size={16} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <div>Refresh Workspace Contents</div>
            </Tooltip.Content>
          </Tooltip.Root>
          <Button variant="outline">
            <SettingsIcon size={16} />
          </Button>
        </div>
      </div>
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Changes</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each data.changes as item, index (index)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                <File size={16} />
                {item.file}
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge>{item.state}</Sidebar.MenuBadge>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
    <Sidebar.Group>
      <!-- Real workspace tree -->
      <Sidebar.GroupLabel>Files</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#if workspaceTree}
            <TreeNodeReal treeNode={workspaceTree} />
          {:else}
            <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
    <!-- Example -->
    <Sidebar.Group>
      <Sidebar.GroupLabel>Example</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each data.tree as item, index (index)}
            <TreeNode {item} />
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Rail />
</Sidebar.Root>
