<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox, Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import InputInternal from '../../components/form/Input.svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import { PATH_DELIMITER } from '../../constants/workspaces.js';
  import { WorkspaceContentType } from '../../enums/workspace';
  import { workspaces } from '../../stores/workspaces';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import effects from '../../utilities/effects';
  import { filterEmpty } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler.js';
  import { featurePermissions } from '../../utilities/permissions.js';
  import { getSelectedFilesDisplay, getWorkspaceFileFolderDisplay } from '../../utilities/workspaces.js';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace;
  export let originalNodes: WorkspaceTreeNodeWithFullPath[];
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      shouldCopy: boolean;
      shouldOverwrite: boolean;
      targetPath: string;
      targetWorkspace: Workspace;
    };
  }>();

  let displayString: string = getWorkspaceFileFolderDisplay(originalNodes);
  let hasSourceDeletePermission: boolean = false;
  let hasTargetEditPermission: boolean = false;
  let shouldOverwrite: boolean = false;
  let targetDirectory: string = '';
  let workspacesContents: WorkspaceTreeNode[] = [];
  let workspacesMap: Record<string, Workspace> = {};
  let workspacePermissionsMap: Record<string, { hasDeletePermission: boolean; hasEditPermission: boolean }> = {};

  $: getWorkspacesContents($workspaces);
  $: {
    workspacesMap = $workspaces.reduce((currentWorkspacesMap, workspace) => {
      return {
        ...currentWorkspacesMap,
        [workspace.name as string]: workspace,
      };
    }, {});
    workspacePermissionsMap = $workspaces.reduce((currentWorkspacePermissionsMap, workspace) => {
      return {
        ...currentWorkspacePermissionsMap,
        [workspace.id]: {
          hasDeletePermission: featurePermissions.workspace.canDelete(user, workspace),
          hasEditPermission: featurePermissions.workspace.canUpdate(user, workspace),
        },
      };
    }, {});
  }
  $: hasSourceDeletePermission = workspacePermissionsMap[currentWorkspace.id]?.hasDeletePermission ?? false;
  $: if (targetDirectory) {
    hasTargetEditPermission =
      workspacePermissionsMap[workspacesMap[getWorkspaceNameFromPath(targetDirectory).workspaceName]?.id]
        ?.hasEditPermission ?? false;
  } else {
    hasTargetEditPermission = false;
  }

  function getWorkspaceNameFromPath(path: string) {
    const [workspaceName, ...actualTargetDirectory] = path.split(PATH_DELIMITER).filter(filterEmpty);
    return {
      actualTargetDirectory,
      workspaceName,
    };
  }

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
    const { workspaceName, actualTargetDirectory } = getWorkspaceNameFromPath(targetDirectory);
    const targetWorkspace = workspacesMap[workspaceName];
    if (targetWorkspace) {
      const targetWorkspaceContents = workspacesContents.find(({ name }) => workspaceName === name);
      if (targetWorkspaceContents) {
        dispatch('confirm', {
          shouldCopy: false,
          shouldOverwrite,
          targetPath: actualTargetDirectory.join(PATH_DELIMITER),
          targetWorkspace: targetWorkspace,
        });
      }
    }
  }

  function onDuplicate() {
    const { workspaceName, actualTargetDirectory } = getWorkspaceNameFromPath(targetDirectory);
    const targetWorkspace = workspacesMap[workspaceName];
    if (targetWorkspace) {
      const targetWorkspaceContents = workspacesContents.find(({ name }) => workspaceName === name);
      if (targetWorkspaceContents) {
        dispatch('confirm', {
          shouldCopy: true,
          shouldOverwrite,
          targetPath: actualTargetDirectory.join(PATH_DELIMITER),
          targetWorkspace: targetWorkspace,
        });
      }
    }
  }
</script>

<Modal height={450} width={380} on:close>
  <ModalHeader on:close>
    <div>Move or Duplicate</div>
  </ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[min-content_auto_min-content_min-content] gap-1 overflow-hidden">
      <div>
        <div>Selected {displayString}:</div>
        <div class="py-1">
          <span class="font-semibold">{getSelectedFilesDisplay(originalNodes.map(({ fullPath }) => fullPath))}</span>
        </div>
      </div>
      <Sidebar.Provider
        style="--sidebar-width: auto"
        className="min-h-0 overflow-y-auto rounded-md border-(--st-gray-20) border-2"
      >
        <Sidebar.Content>
          <Sidebar.Menu className="h-full">
            {#if workspacesContents.length > 0}
              {#each workspacesContents as workspaceContents}
                <WorkspaceTreeView
                  selectedTreeNodePath={targetDirectory}
                  treeNode={workspaceContents}
                  enableContextMenu={false}
                  showFiles={false}
                  showRootNode={true}
                  workspace={workspacesMap[workspaceContents?.name ?? '']}
                  {user}
                  on:nodeClicked={onFolderClicked}
                />
              {/each}
            {:else}
              <div class="flex h-full items-center justify-center">
                <div class="text-sm text-gray-500">No other workspaces found</div>
              </div>
            {/if}
          </Sidebar.Menu>
        </Sidebar.Content>
      </Sidebar.Provider>
      <InputInternal layout="stacked" class="py-1">
        <Label size="sm" for="target-path">Target Directory</Label>
        <Input sizeVariant="xs" id="target-path" name="target-path" autocomplete="off" bind:value={targetDirectory} />
      </InputInternal>
      <div class="flex flex-row-reverse items-center gap-x-2">
        <Checkbox name="shouldOverwrite" id="shouldOverwrite" bind:checked={shouldOverwrite} />
        <label class="select-none" for="shouldOverwrite">Overwrite Existing {displayString}</label>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button
      class="st-button"
      disabled={!targetDirectory}
      on:click={onMove}
      use:permissionHandler={{
        hasPermission: hasSourceDeletePermission && hasTargetEditPermission,
        permissionError: `You do not have permission to move ${originalNodes.length === 1 ? 'this' : 'these'} ${displayString.toLowerCase()} from the original workspace.`,
      }}
    >
      Move {displayString}
    </button>
    <button
      class="st-button"
      disabled={!targetDirectory}
      on:click={onDuplicate}
      use:permissionHandler={{
        hasPermission: hasTargetEditPermission,
        permissionError: `You do not have permission to copy ${originalNodes.length === 1 ? 'this' : 'these'} ${displayString.toLowerCase()} into the target workspace.`,
      }}
    >
      Duplicate {displayString}
    </button>
  </ModalFooter>
</Modal>
