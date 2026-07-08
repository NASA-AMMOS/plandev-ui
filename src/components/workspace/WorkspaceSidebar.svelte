<script lang="ts">
  import { Input as InputStellar } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { User, UserId } from '../../types/app';
  import type { Parcel } from '../../types/sequencing';
  import type {
    Workspace,
    WorkspaceCollaborator,
    WorkspaceMetadata,
    WorkspaceNodeRunActionEvent,
  } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';
  import { getFolderPathForNode } from '../../utilities/workspaces';
  import Input from '../form/Input.svelte';
  import Loading from '../Loading.svelte';
  import ActionSidebarList from '../sequencing/actions/ActionSidebarList.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import WorkspaceCollaboratorInput from '../ui/Tags/WorkspaceCollaboratorInput.svelte';
  import PanelHeader from './PanelHeader.svelte';
  import WorkspaceFileBrowser from './WorkspaceFileBrowser/WorkspaceFileBrowser.svelte';
  import WorkspaceSnapshotsPanel from './WorkspaceSnapshotsPanel.svelte';
  import WorkspaceTabHeader from './WorkspaceTabHeader.svelte';

  const dispatch = createEventDispatcher<{
    addCollaborator: WorkspaceCollaborator[];
    copyFileLocation: string;
    copyFullPath: string;
    deleteCollaborator: string;
    importFile: string;
    newFile: string;
    newFolder: string;
    refreshWorkspace: void;
    runAction: WorkspaceNodeRunActionEvent;
    runActionFromSidebar: ActionDefinition;
    saveFile: void;
    selectAction: { id: number };
    selectAllRuns: void;
    updateWorkspaceMetadata: Partial<WorkspaceMetadata>;
  }>();

  export let actions: ActionDefinition[] = [];
  export let activeTab: string = 'files';
  export let currentBreadcrumbPath: string = '';
  export let isAllRunsSelected: boolean = false;
  export let isWorkspaceLoading: boolean = false;
  export let selectedActionId: number | null = null;
  export let selectedFilePath: string | null = null;
  export let user: User | null;
  export let users: UserId[] = [];
  export let usersLoading: boolean = false;
  export let workspaceTree: WorkspaceTreeNode | null | undefined = undefined;
  export let workspace: Workspace | null | undefined = null;
  export let workspaces: Workspace[] = [];
  export let parcels: Parcel[] = [];
  export let hasEditWorkspacePermission: boolean = false;
  export let hasEditWorkspaceCollaboratorsPermission: boolean = false;
  // For the Snapshots tab: the open file with unsaved changes (or null), and a saver for "Save & snapshot".
  export let unsavedFilePath: string | null = null;
  export let saveActiveDocument: (() => Promise<boolean>) | null = null;

  const permissionError = 'You do not have permission to edit this workspace';

  let didWorkspaceUpdate: boolean = false;
  let lastRefreshTime: Date = new Date();
  let selectedFolderPath: string | null = null;
  let wasLoading: boolean = false;

  // Folder context of the primary selection: the selected folder itself, or a file's parent folder.
  // `null` when nothing is selected, in which case callers fall back to `currentBreadcrumbPath`.
  $: selectedFolderPath = getFolderPathForNode(workspaceTree?.contents ?? [], selectedFilePath);

  $: if (isWorkspaceLoading) {
    wasLoading = true;
  } else if (wasLoading) {
    wasLoading = false;
    showRefreshIndicator();
  }

  async function showRefreshIndicator() {
    didWorkspaceUpdate = true;
    lastRefreshTime = new Date();
    await new Promise(resolve => setTimeout(resolve, 1000));
    didWorkspaceUpdate = false;
  }

  function onNewFolder() {
    dispatch('newFolder', selectedFolderPath ?? currentBreadcrumbPath);
  }

  function onNewFile() {
    dispatch('newFile', selectedFolderPath ?? currentBreadcrumbPath);
  }

  function onImportFile() {
    dispatch('importFile', selectedFolderPath ?? currentBreadcrumbPath);
  }

  function onWorkspaceCollaboratorsCreate(event: CustomEvent<WorkspaceCollaborator[]>) {
    if (workspace) {
      dispatch('addCollaborator', event.detail);
    }
  }

  function onWorkspaceCollaboratorsDelete(event: CustomEvent<string>) {
    if (workspace) {
      dispatch('deleteCollaborator', event.detail);
    }
  }

  function onWorkspaceNameChange(event: Event) {
    const { value: updatedWorkspaceName } = getTarget(event);
    if (workspace) {
      dispatch('updateWorkspaceMetadata', {
        name: updatedWorkspaceName as string,
      });
    }
  }

  function onWorkspaceParcelChange(event: Event) {
    const { value: updatedWorkspaceParcel } = getTarget(event);
    if (workspace && updatedWorkspaceParcel) {
      dispatch('updateWorkspaceMetadata', {
        parcel_id: updatedWorkspaceParcel as number,
      });
    }
  }

  function onRefreshWorkspace() {
    dispatch('refreshWorkspace');
  }

  function onRunActionFromSidebar(event: CustomEvent<ActionDefinition>) {
    dispatch('runActionFromSidebar', event.detail);
  }
</script>

<div class="flex h-full w-full flex-col">
  <div class="h-full min-h-[300px]" role="tabpanel">
    {#if activeTab === 'files'}
      <div class="grid h-full grid-rows-[min-content_auto]">
        <Sidebar.Header className="p-0">
          <WorkspaceTabHeader
            title="Workspace Files"
            {didWorkspaceUpdate}
            {lastRefreshTime}
            {hasEditWorkspacePermission}
            on:newFile={onNewFile}
            on:newFolder={onNewFolder}
            on:importFile={onImportFile}
            on:refreshWorkspace={onRefreshWorkspace}
          />
        </Sidebar.Header>
        <Sidebar.Content className="h-full">
          <Sidebar.Group className="h-full p-0">
            <Sidebar.GroupContent className="h-full">
              <Sidebar.Menu className="h-full">
                {#if workspaceTree && workspace}
                  <WorkspaceFileBrowser
                    bind:currentBreadcrumbPath
                    bind:selectedTreeNodePath={selectedFilePath}
                    {actions}
                    treeNode={workspaceTree}
                    {workspace}
                    {user}
                    on:deleteNodes
                    on:moveNodes
                    on:renameNode
                    on:newFile
                    on:download
                    on:newFolder
                    on:openInNewTab
                    on:importFile
                    on:copyFileLocation
                    on:copyFullPath
                    on:moveNodesToWorkspace
                    on:runAction
                  />
                {:else}
                  <div class="p-2">
                    <Loading>Loading workspace...</Loading>
                  </div>
                {/if}
              </Sidebar.Menu>
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>
      </div>
    {:else if activeTab === 'actions'}
      <ActionSidebarList
        {actions}
        {isAllRunsSelected}
        {selectedActionId}
        {user}
        {workspace}
        on:selectAction
        on:selectAllRuns
        on:runAction={onRunActionFromSidebar}
      />
    {:else if activeTab === 'snapshots'}
      <WorkspaceSnapshotsPanel
        workspaceId={workspace?.id ?? null}
        {user}
        hasEditPermission={hasEditWorkspacePermission}
        {unsavedFilePath}
        {saveActiveDocument}
        on:snapshotRestored
      />
    {:else if activeTab === 'settings'}
      <div class="grid h-full grid-rows-[min-content_auto]">
        <Sidebar.Header className="p-0">
          <PanelHeader>
            <SectionTitle>Workspace Settings</SectionTitle>
          </PanelHeader>
        </Sidebar.Header>
        <Sidebar.Content className="h-full">
          <Sidebar.Group className="h-full p-0">
            <Sidebar.GroupContent className="h-full">
              <Sidebar.Menu className="h-full text-xs">
                <fieldset>
                  <Input layout="stacked">
                    <label use:tooltip={{ content: 'Workspace Name', placement: 'top' }} for="name">
                      Workspace Name
                    </label>
                    <div
                      use:permissionHandler={{
                        hasPermission: hasEditWorkspacePermission,
                        permissionError,
                      }}
                      class="w-full"
                    >
                      <InputStellar
                        autocomplete="off"
                        sizeVariant="xs"
                        class="w-full"
                        name="name"
                        id="name"
                        aria-label="name"
                        value={workspace?.name}
                        on:change={onWorkspaceNameChange}
                      />
                    </div>
                  </Input>
                </fieldset>
                <fieldset>
                  <Input layout="stacked">
                    <label for="parcel">Parcel</label>
                    <select
                      class="st-select w-full"
                      name="parcel"
                      id="parcel"
                      aria-label="Parcel"
                      value={workspace?.parcel_id}
                      use:permissionHandler={{
                        hasPermission: hasEditWorkspacePermission,
                        permissionError,
                      }}
                      on:change={onWorkspaceParcelChange}
                    >
                      <option value={null} />
                      {#each parcels as parcel}
                        <option value={parcel.id} selected={parcel.id === workspace?.parcel_id}>
                          {parcel.name}
                        </option>
                      {/each}
                    </select>
                  </Input>
                </fieldset>
                <fieldset>
                  <Input layout="stacked">
                    <label use:tooltip={{ content: 'Collaborators', placement: 'top' }} for="collaborators">
                      Collaborators
                    </label>
                    <WorkspaceCollaboratorInput
                      name="collaborators"
                      collaborators={workspace?.collaborators ?? []}
                      disabled={usersLoading}
                      {workspaces}
                      {workspace}
                      {user}
                      {users}
                      on:create={onWorkspaceCollaboratorsCreate}
                      on:delete={onWorkspaceCollaboratorsDelete}
                      use={[
                        [
                          permissionHandler,
                          {
                            hasPermission: hasEditWorkspaceCollaboratorsPermission,
                            permissionError: 'You do not have permission to modify collaborators',
                          },
                        ],
                      ]}
                    />
                  </Input>
                </fieldset>
              </Sidebar.Menu>
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.toggle-tree.disabled) {
    opacity: var(--st-button-disabled-opacity);
  }
</style>
