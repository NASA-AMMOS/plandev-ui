<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  // Keep these imports for the commented grid layout reference
  // import WorkspaceTreeView from '../../../components/workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import * as Sidebar from '../../../components/sidebar-evaluation/index.js';
  import AppSidebar from '../../../components/workspace/AppSidebar.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import { parcel, workspaceId } from '../../../stores/workspaces';
  import type { Workspace } from '../../../types/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import effects from '../../../utilities/effects';
  import type { PageData } from './$types';
  import type { Workspace } from '../../../types/workspace';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let selectedSequenceDefinition: string = '';
  let selectedSequencePath: string | null = null;
  let workspaceTree: WorkspaceTreeNode | null = null;

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;
    selectedSequencePath = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
    getWorkspaceContents(initialWorkspace);
  }

  $: getSelectedSequenceDefinition(selectedSequencePath);

  async function getWorkspaceContents(workspace: Workspace | undefined) {
    if (workspace) {
      const workspaceContents = await effects.getWorkspaceContents(workspace.id, user);
      if (workspaceContents) {
        workspaceTree = {
          contents: workspaceContents,
          name: workspace.name,
          type: WorkspaceContentType.Workspace,
        };
      }
    }
  }

  async function getSelectedSequenceDefinition(sequencePath: string | null) {
    if (sequencePath !== null && user) {
      selectedSequenceDefinition =
        (await effects.getWorkspaceFileContent($workspaceId, removeWorkspaceFromPath(sequencePath), user)) ?? '';
    } else {
      selectedSequenceDefinition = '';
    }
  }

  async function onNewFolder() {
    if ($workspaceId != null && user) {
      await effects.newWorkspaceFolder($workspaceId, user);
      refreshWorkspaceContents();
    }
  }

  async function onNewSequence() {
    if ($workspaceId != null && user) {
      await effects.newWorkspaceSequence($workspaceId, user);
      refreshWorkspaceContents();
    }
  }

  function removeWorkspaceFromPath(path: string) {
    return path.replace(`${workspaceTree?.name ?? ''}/`, '');
  }

  function onNodeClicked({
    detail: { treeNode, treeNodePath },
  }: CustomEvent<{
    toggleState: boolean;
    treeNode: WorkspaceTreeNode;
    treeNodePath: string;
  }>) {
    if (treeNode.type === WorkspaceContentType.Sequence) {
      selectedSequencePath = treeNodePath;
    }
  }

  function onSaveWorkspaceFile() {
    if (selectedSequencePath) {
      effects.saveWorkspaceFile(
        $workspaceId,
        removeWorkspaceFromPath(selectedSequencePath),
        selectedSequenceDefinition,
        user,
      );
    }
  }

  function onWorkspaceFileUpdated({ detail: { input } }: CustomEvent<{ input: string; output: string }>) {
    selectedSequenceDefinition = input;
  // function refreshWorkspaceContents() {
  //   getWorkspaceContents(initialWorkspace);
  // }

  // Placeholder refresh function for the new sidebar
  function refreshWorkspaceContents() {
    getWorkspaceContents(initialWorkspace);
  }
</script>

<Sidebar.Provider>
  <AppSidebar {onNewFolder} {onNewSequence} {refreshWorkspaceContents} {workspaceTree} />
  <Sidebar.Inset>
    <div class="grid h-full grid-cols-1 grid-rows-1">
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
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>

<!-- Original grid layout commented out for reference -->
<!--
<CssGrid bind:columns={$workspaceColumns}>
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>Workspace</SectionTitle>
      <div>
        <Button variant="outline" class="gap-1">
          <Clapperboard size={16} />
          Actions
        </Button>
        <Button variant="outline" class="gap-1" on:click={onSaveWorkspaceFile}>
          <Clapperboard size={16} />
          Save
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
      <div class="h-max p-2">
        <WorkspaceTreeView
          treeNode={workspaceTree}
          selectedTreeNodePath={selectedSequencePath}
          on:nodeClicked={onNodeClicked}
        />
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
    on:sequence={onWorkspaceFileUpdated}
  />
</CssGrid>
-->

<style>
</style>
