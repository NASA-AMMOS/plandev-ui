<script lang="ts">
  import { Button, Input as InputStellar, Tooltip } from '@nasa-jpl/stellar-svelte';
  import { Clapperboard, Files, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-svelte';
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
  import Input from '../form/Input.svelte';
  import Loading from '../Loading.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import WorkspaceCollaboratorInput from '../ui/Tags/WorkspaceCollaboratorInput.svelte';
  import WorkspaceFileBrowser from './WorkspaceFileBrowser/WorkspaceFileBrowser.svelte';
  import WorkspaceTabHeader from './WorkspaceTabHeader.svelte';

  const dispatch = createEventDispatcher<{
    actionsClick: void;
    addCollaborator: WorkspaceCollaborator[];
    copyFileLocation: string;
    copyFullPath: string;
    deleteCollaborator: string;
    importFile: string;
    newFile: string;
    newFolder: string;
    refreshWorkspace: void;
    runAction: WorkspaceNodeRunActionEvent;
    saveFile: void;
    updateWorkspaceMetadata: Partial<WorkspaceMetadata>;
  }>();

  export let actions: ActionDefinition[] = [];
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

  const permissionError = 'You do not have permission to edit this workspace';

  export let panelOpen: boolean = true;

  let activeTab: string = 'files';
  let didWorkspaceUpdate: boolean = false;
  let lastRefreshTime: Date = new Date();
  let currentBreadcrumbPath: string = ''; // Navigation state - current folder being viewed as root

  function handleTabClick(tab: string, wasActive: boolean) {
    if (wasActive) {
      // Clicking active tab toggles the panel
      panelOpen = !panelOpen;
    } else {
      // Switching tabs or opening closed panel
      activeTab = tab;
      panelOpen = true;
    }
  }

  function togglePanel() {
    panelOpen = !panelOpen;
  }

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
    dispatch('newFolder', currentBreadcrumbPath);
  }

  function onNewFile() {
    dispatch('newFile', currentBreadcrumbPath);
  }

  function onImportFile() {
    dispatch('importFile', currentBreadcrumbPath);
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
  <div class="flex h-full">
    <div class="flex h-full w-[45px] flex-shrink-0 flex-col justify-between border-r border-border bg-muted">
      <div class="flex h-auto w-full flex-col items-center justify-start gap-0 p-0" role="tablist">
        <Sidebar.MenuButton
          className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
          isActive={activeTab === 'files' && panelOpen}
          tooltipContent="Files"
          on:click={e => handleTabClick('files', e.detail.wasActive)}
        >
          <Files size={16} />
        </Sidebar.MenuButton>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Button
              class="h-[48px] w-full rounded-none ring-inset hover:bg-[var(--sidebar-accent)]"
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
        <Sidebar.MenuButton
          className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
          isActive={activeTab === 'settings' && panelOpen}
          tooltipContent="Settings"
          on:click={e => handleTabClick('settings', e.detail.wasActive)}
        >
          <Settings size={16} />
        </Sidebar.MenuButton>
      </div>
      <div class="flex w-full flex-col items-center pb-2">
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Button
              class="h-[32px] w-[32px] rounded-md p-0 ring-inset hover:bg-[var(--sidebar-accent)]"
              builders={[builder]}
              variant="ghost"
              aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
              on:click={togglePanel}
            >
              {#if panelOpen}
                <PanelLeftClose size={16} />
              {:else}
                <PanelLeftOpen size={16} />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>{panelOpen ? 'Collapse panel' : 'Expand panel'}</div>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
    <div class="flex h-full w-full flex-col" class:hidden={!panelOpen}>
      <div class="mt-0 h-full min-h-[300px]" role="tabpanel">
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
              <Sidebar.Group className="p-0 h-full">
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
        {:else if activeTab === 'settings'}
          <div class="grid h-full grid-rows-[min-content_auto]">
            <Sidebar.Header className="p-0">
              <div
                class="flex h-[48px] items-center justify-between gap-0 border-b border-border bg-background p-[6px]"
              >
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
  </div>
</Sidebar.Root>

<style>
  :global(.toggle-tree.disabled) {
    opacity: var(--st-button-disabled-opacity);
  }
</style>
