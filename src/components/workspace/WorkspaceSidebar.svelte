<script lang="ts">
  import { Button, Tabs, Tooltip } from '@nasa-jpl/stellar-svelte';
  import type { IRowNode } from 'ag-grid-community';
  import { Clapperboard, Files, FolderTree, Settings } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User, UserId } from '../../types/app';
  import type { Parcel } from '../../types/sequencing';
  import type { Workspace, WorkspaceCollaborator, WorkspaceMetadata } from '../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import WorkspaceCollaboratorInput from '../ui/Tags/WorkspaceCollaboratorInput.svelte';
  import WorkspaceGridView from './WorkspaceGridView/WorkspaceGridView.svelte';
  import WorkspaceTabHeader from './WorkspaceTabHeader.svelte';
  import WorkspaceTreeView from './WorkspaceTreeView/WorkspaceTreeView.svelte';

  const dispatch = createEventDispatcher<{
    actionsClick: void;
    addCollaborator: WorkspaceCollaborator[];
    copyFileLocation: string;
    deleteCollaborator: string;
    importFile: string;
    moveToWorkspace: string;
    newFolder: string;
    newSequence: string;
    refreshWorkspace: void;
    saveSequence: void;
    updateWorkspaceMetadata: Partial<WorkspaceMetadata>;
  }>();

  export let isWorkspaceLoading: boolean = false;
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
  export let isRowSelectable: (node: Pick<IRowNode<WorkspaceTreeNodeWithFullPath>, 'data'>) => boolean = (
    _node: Pick<IRowNode<WorkspaceTreeNodeWithFullPath>, 'data'>,
  ) => {
    return true;
  };

  const permissionError = 'You do not have permission to edit this workspace';

  let didWorkspaceUpdate: boolean = false;
  let lastRefreshTime: Date = new Date();

  $: workspaceTree && didUpdate(isWorkspaceLoading);

  async function didUpdate(loading: boolean) {
    if (loading === false) {
      didWorkspaceUpdate = true;
      lastRefreshTime = new Date();
      // introduce a fake timeout so the checkmark icon has some time to be visible
      await new Promise(resolve => setTimeout(resolve, 1000));
      didWorkspaceUpdate = false;
    }
  }

  function onActionsClick() {
    dispatch('actionsClick');
  }

  function onNewFolder() {
    dispatch('newFolder', '');
  }

  function onNewSequence() {
    dispatch('newSequence', '');
  }

  function onImportFile() {
    dispatch('importFile', '');
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
</script>

<Sidebar.Root className="h-full inset-x-0 border-none flex">
  <Tabs.Root value="files" orientation="vertical" class="flex h-full">
    <div class="flex h-full w-10 border-r border-border bg-muted">
      <Tabs.List class="flex h-auto w-full flex-col items-center justify-start gap-0">
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="files" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button class="hover:bg-transparent" builders={[builder]} variant="ghost" aria-label="Files">
                <Files size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Files</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="grid" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button class="hover:bg-transparent" builders={[builder]} variant="ghost" aria-label="Grid">
                <FolderTree size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Grid</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Button
              class="h-10 hover:bg-transparent"
              builders={[builder]}
              variant="ghost"
              aria-label="Actions"
              on:click={onActionsClick}
            >
              <Clapperboard size={16} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Actions</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="settings" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button builders={[builder]} variant="ghost" name="Settings">
                <Settings size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Settings</div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tabs.List>
    </div>
    <div class="flex h-full w-full flex-col">
      <Tabs.Content value="files" class="mt-0 h-full">
        <div class="grid h-full grid-rows-[min-content_auto]">
          <Sidebar.Header className="p-0">
            <WorkspaceTabHeader
              title="Workspace Tree View"
              {didWorkspaceUpdate}
              {lastRefreshTime}
              {hasEditWorkspacePermission}
              on:newSequence={onNewSequence}
              on:newFolder={onNewFolder}
              on:importFile={onImportFile}
              on:refreshWorkspace={onRefreshWorkspace}
            />
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Group className="p-0 h-full">
              <Sidebar.GroupContent className="h-full">
                <Sidebar.Menu className="h-full">
                  {#if workspaceTree}
                    <WorkspaceTreeView
                      selectedTreeNodePath={selectedFilePath}
                      treeNode={workspaceTree}
                      {workspace}
                      {user}
                      on:nodeClicked
                      on:nodeDelete
                      on:nodeMove
                      on:nodeRename
                      on:newFolder
                      on:newSequence
                      on:importFile
                      on:copyFileLocation
                      on:moveToWorkspace
                    />
                  {:else}
                    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
                  {/if}
                </Sidebar.Menu>
              </Sidebar.GroupContent>
            </Sidebar.Group>
          </Sidebar.Content>
        </div>
      </Tabs.Content>
      <Tabs.Content value="grid" class="mt-0 h-full" style="min-height: 300px;">
        <div class="grid h-full grid-rows-[min-content_auto]">
          <Sidebar.Header className="p-0">
            <WorkspaceTabHeader
              title="Workspace Table View"
              {didWorkspaceUpdate}
              {lastRefreshTime}
              {hasEditWorkspacePermission}
              on:newSequence={onNewSequence}
              on:newFolder={onNewFolder}
              on:importFile={onImportFile}
              on:refreshWorkspace={onRefreshWorkspace}
            />
          </Sidebar.Header>
          <Sidebar.Content className="h-full">
            <Sidebar.Group className="p-0 h-full">
              <Sidebar.GroupContent className="h-full">
                <Sidebar.Menu className="h-full">
                  {#if workspaceTree && workspace}
                    <WorkspaceGridView
                      selectedTreeNodePath={selectedFilePath}
                      treeNode={workspaceTree}
                      {workspace}
                      {user}
                      {isRowSelectable}
                      on:nodeClicked
                      on:nodeDelete
                      on:nodeMove
                      on:nodeRename
                      on:newSequence
                      on:newFolder
                      on:importFile
                      on:copyFileLocation
                      on:moveToWorkspace
                    />
                  {:else}
                    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
                  {/if}
                </Sidebar.Menu>
              </Sidebar.GroupContent>
            </Sidebar.Group>
          </Sidebar.Content>
        </div>
      </Tabs.Content>
      <Tabs.Content value="settings" class="mt-0 h-full" style="min-height: 300px;">
        <div class="grid h-full grid-rows-[min-content_auto]">
          <Sidebar.Header className="p-0">
            <div class="flex items-center justify-between gap-0 border-b border-border bg-background p-[6px]">
              <SectionTitle>Workspace Settings</SectionTitle>
            </div>
          </Sidebar.Header>
          <Sidebar.Content className="h-full">
            <Sidebar.Group className="p-0 h-full">
              <Sidebar.GroupContent className="h-full">
                <Sidebar.Menu className="h-full text-xs">
                  <fieldset>
                    <Input layout="stacked">
                      <label use:tooltip={{ content: 'Workspace Name', placement: 'top' }} for="name">
                        Workspace Name
                      </label>
                      <input
                        class="st-input w-full"
                        name="name"
                        id="name"
                        aria-label="name"
                        value={workspace?.name}
                        on:change={onWorkspaceNameChange}
                      />
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
      </Tabs.Content>
    </div>
  </Tabs.Root>
</Sidebar.Root>

<style>
  :global(.toggle-tree.disabled) {
    opacity: var(--st-button-disabled-opacity);
  }
</style>
