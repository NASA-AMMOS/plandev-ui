<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../../components/ui/CssGridGutter.svelte';
  import * as Sidebar from '../../../components/ui/Sidebar/index.js';
  import WorkspaceSidebar from '../../../components/workspace/WorkspaceSidebar.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import { parcel, workspaceColumns, workspaceId } from '../../../stores/workspaces';
  import type { Workspace } from '../../../types/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import effects from '../../../utilities/effects';
  import { getWorkspacesUrl } from '../../../utilities/routes';
  import type { PageData } from './$types';

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let selectedSequenceDefinition: string = '';
  let selectedSequencePath: string | null = null;
  let workspaceTree: WorkspaceTreeNode | null = null;

  $: if ($workspaceId !== -1) {
    selectedSequencePath = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
    getSelectedSequenceDefinition(selectedSequencePath);
  }

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

  function refreshWorkspaceContents() {
    getWorkspaceContents(initialWorkspace);
  }

  async function getSelectedSequenceDefinition(sequencePath: string | null) {
    if (sequencePath !== null && user) {
      selectedSequenceDefinition = (await effects.getWorkspaceFileContent($workspaceId, sequencePath, user)) ?? '';
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

  function onNodeClicked({
    detail: { toggleState, treeNode, treeNodePath },
  }: CustomEvent<{
    toggleState?: boolean;
    treeNode: WorkspaceTreeNode;
    treeNodePath: string;
  }>) {
    if (treeNode.type === WorkspaceContentType.Sequence && toggleState === true) {
      if (treeNodePath !== selectedSequencePath) {
        selectedSequencePath = treeNodePath;
        goto(getWorkspacesUrl(base, $workspaceId, selectedSequencePath));
      }
    }
  }

  function onSaveWorkspaceFile() {
    if (selectedSequencePath) {
      effects.saveWorkspaceFile($workspaceId, selectedSequencePath, selectedSequenceDefinition, user);
    }
  }

  function onWorkspaceFileUpdated({ detail: { input } }: CustomEvent<{ input: string; output: string }>) {
    selectedSequenceDefinition = input;
  }

  onMount(() => {
    if (initialWorkspace) {
      $workspaceId = initialWorkspace.id;
      selectedSequencePath = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
      getWorkspaceContents(initialWorkspace);
    }
  });
</script>

<CssGrid bind:columns={$workspaceColumns}>
  <Sidebar.Provider style="--sidebar-width: auto" className="min-h-0">
    <WorkspaceSidebar
      {selectedSequencePath}
      {user}
      {workspaceTree}
      on:nodeClicked={onNodeClicked}
      on:newFolder={onNewFolder}
      on:newSequence={onNewSequence}
      on:refreshWorkspace={refreshWorkspaceContents}
      on:saveSequence={onSaveWorkspaceFile}
    />
  </Sidebar.Provider>
  <CssGridGutter track={1} type="column" />
  <Sidebar.Inset className="min-h-0">
    <div class="grid h-full grid-cols-1 grid-rows-1">
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
    </div>
  </Sidebar.Inset>
</CssGrid>

<style>
</style>
