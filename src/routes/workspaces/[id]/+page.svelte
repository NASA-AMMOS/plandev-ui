<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import { Button, DropdownMenu, Tooltip } from '@nasa-jpl/stellar-svelte';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import {
    ArrowUpFromLine,
    ChevronDown,
    Clapperboard,
    FilePlus,
    FolderPlus,
    FolderTree,
    RefreshCcw,
  } from 'lucide-svelte';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../../components/ui/CssGridGutter.svelte';
  import Panel from '../../../components/ui/Panel.svelte';
  import SectionTitle from '../../../components/ui/SectionTitle.svelte';
  import WorkspaceTreeView from '../../../components/workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import { parcel, workspaceColumns, workspaceId } from '../../../stores/workspaces';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import effects from '../../../utilities/effects';
  import type { PageData } from './$types';

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let selectedSequenceDefinition: string | null = null;
  let selectedSequenceId: string | null = null;
  let workspaceTree: WorkspaceTreeNode | null = null;

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;
    selectedSequenceId = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
    getWorkspaceContents($workspaceId);
  }

  $: getSelectedSequenceDefinition(selectedSequenceId);

  async function getWorkspaceContents(workspaceId: number) {
    if (user) {
      const workspaceContents = await effects.getWorkspaceContents(workspaceId, user);
      if (workspaceContents) {
        workspaceTree = {
          contents: workspaceContents,
          name: initialWorkspace.name,
          type: WorkspaceContentType.Workspace,
        };
      }
    }
  }

  async function getSelectedSequenceDefinition(sequenceId: string | null) {
    if (sequenceId !== null && user) {
      selectedSequenceDefinition = await effects.getSequenceDefinition(sequenceId, user);
    } else {
      selectedSequenceDefinition = null;
    }
  }

  function onNewFolder() {
    if ($workspaceId != null && user) {
      effects.newWorkspaceFolder($workspaceId, user);
    }
  }

  function refreshWorkspaceContents() {
    getWorkspaceContents($workspaceId);
  }
</script>

<CssGrid bind:columns={$workspaceColumns}>
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>Workspace</SectionTitle>
      <div>
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
            <DropdownMenu.Item class="cursor-pointer gap-1"><FilePlus size={16} />New Sequence</DropdownMenu.Item>
            <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewFolder}>
              <FolderPlus size={16} />New Folder
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item class="cursor-pointer gap-1"><ArrowUpFromLine size={16} />Import File</DropdownMenu.Item>
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
    </svelte:fragment>
    <svelte:fragment slot="body">
      <div class="p-2">
        <WorkspaceTreeView treeNode={workspaceTree} />
      </div>
    </svelte:fragment>
  </Panel>
  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    parcel={$parcel}
    showCommandFormBuilder={true}
    sequenceDefinition={selectedSequenceDefinition}
    title="Sequence - Definition Editor"
    {user}
    readOnly={false}
    workspaceId={$workspaceId}
    on:sequence
    on:didChangeModelContent
  />
</CssGrid>

<style>
</style>
