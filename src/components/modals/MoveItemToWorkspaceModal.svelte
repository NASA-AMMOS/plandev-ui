<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import { PATH_DELIMITER } from '../../constants/workspaces.js';
  import { WorkspaceContentType } from '../../enums/workspace';
  import { workspaces } from '../../stores/workspaces';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import effects from '../../utilities/effects';
  import { filterEmpty } from '../../utilities/generic';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace;
  export let originalNode: WorkspaceTreeNode;
  export let originalPath: string;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { shouldCopy: boolean; targetPath: string; targetWorkspace: Workspace };
  }>();

  let targetDirectory: string = originalPath;
  let targetFilename: string = '';
  let typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';
  let workspacesContents: WorkspaceTreeNode[] = [];
  let workspacesMap: Record<string, Workspace> = {};

  $: {
    const matches = /^((?<path>[^.]+)\/)?(?<filename>[^.]+\.[^.]+)$/.exec(targetDirectory);
    if (matches && matches.groups) {
      const { filename, path } = matches.groups;

      targetDirectory = path;
      targetFilename = filename;
    }
  }
  $: getWorkspacesContents($workspaces);
  $: workspacesMap = $workspaces.reduce((currentWorkspacesMap, workspace) => {
    return {
      ...currentWorkspacesMap,
      [workspace.name as string]: workspace,
    };
  }, {});

  async function getWorkspacesContents(workspaces: Workspace[]) {
    const fetchedWorkspacesContents = await Promise.all(
      workspaces
        .filter(workspace => workspace.id !== currentWorkspace.id)
        .map(async (workspace): Promise<WorkspaceTreeNode | null> => {
          const workspaceContents = await effects.getWorkspaceContents(workspace.id, user);

          return {
            contents: workspaceContents ?? [],
            name: workspace.name,
            type: WorkspaceContentType.Workspace,
          };
        }),
    );

    workspacesContents = fetchedWorkspacesContents.filter(filterEmpty);
  }

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function onMove() {
    const workspaceName = targetDirectory.split(PATH_DELIMITER).filter(filterEmpty)[0];
    const targetWorkspace = workspacesMap[workspaceName];
    if (targetWorkspace) {
      dispatch('confirm', {
        shouldCopy: false,
        targetPath: `${targetDirectory}/${targetFilename}`,
        targetWorkspace: targetWorkspace,
      });
    }
  }

  function onDuplicate() {
    const workspaceName = targetDirectory.split(PATH_DELIMITER).filter(filterEmpty)[0];
    const targetWorkspace = workspacesMap[workspaceName];
    if (targetWorkspace) {
      dispatch('confirm', {
        shouldCopy: true,
        targetPath: `${targetDirectory}/${targetFilename}`,
        targetWorkspace: targetWorkspace,
      });
    }
  }
</script>

<Modal height={500} width={380}>
  <ModalHeader showClose={false}>
    Move or Duplicate {originalNode.name}
  </ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[min-content_auto_min-content] gap-1 overflow-hidden">
      <div>
        <div class="font-bold">Location</div>
        <div>Current location: {currentWorkspace.name}/{originalPath}</div>
      </div>
      <Sidebar.Provider
        style="--sidebar-width: auto"
        className="min-h-0 overflow-y-auto rounded-md border-(--st-gray-20) border-2"
      >
        <Sidebar.Content>
          <Sidebar.Menu className="h-full">
            {#each workspacesContents as workspaceContents}
              <WorkspaceTreeView
                selectedTreeNodePath={targetDirectory}
                treeNode={workspaceContents}
                enableContextMenu={false}
                showFiles={false}
                showRootNode={true}
                on:nodeClicked={onFolderClicked}
              />
            {/each}
          </Sidebar.Menu>
        </Sidebar.Content>
      </Sidebar.Provider>
      <fieldset>
        <Label class="pb-0.5" size="sm" for="target-path">Target Directory</Label>
        <Input sizeVariant="xs" id="target-path" name="target-path" autocomplete="off" bind:value={targetDirectory} />
      </fieldset>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onMove}> Move {typeString} </button>
    <button class="st-button" on:click={onDuplicate}> Duplicate {typeString} </button>
  </ModalFooter>
</Modal>
