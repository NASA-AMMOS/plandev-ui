<svelte:options immutable={true} />

<script lang="ts">
  import { Badge, Button, Input as InputStellar, Popover, Tabs } from '@nasa-jpl/stellar-svelte';
  import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
  import { ChevronDown, TriangleAlert } from 'lucide-svelte';
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { actionDefinitionsByWorkspace, actionRunsByWorkspace } from '../../../stores/actions';
  import { workspaceId } from '../../../stores/workspaces';
  import type { ActionDefinition, ActionDefinitionVersion, ActionRunSlim } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type { ArgumentsMap, FormParameter, RequiredParametersList } from '../../../types/parameter';
  import type { Workspace } from '../../../types/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import {
    getDefaultsFromSchema,
    getLatestRunnableVersion,
    getStatusForActionRun,
    getUserSequenceValueSchemaOptions,
    openActionRun,
    truncateRunParameters,
    valueSchemaRecordToParametersMap,
  } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import { isEmpty } from '../../../utilities/generic';
  import { isMetaOrCtrlPressed } from '../../../utilities/keyboardEvents';
  import { showConfirmModal } from '../../../utilities/modal';
  import { applyRequiredErrors, getArguments, getFormParameters } from '../../../utilities/parameters';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import { formatMS } from '../../../utilities/time';
  import { tooltip } from '../../../utilities/tooltip';
  import Input from '../../form/Input.svelte';
  import Parameters from '../../parameters/Parameters.svelte';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import MonacoEditor from '../../ui/MonacoEditor.svelte';
  import SectionCard from '../../ui/SectionCard.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  export let actionDefinitionId: number;
  export let user: User | null;
  export let workspace: Workspace | null | undefined = null;
  export let workspaceFiles: WorkspaceTreeNodeWithFullPath[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    dirty: boolean;
    runAction: ActionDefinition;
    viewRun: { runId: number };
  }>();

  let actionDefinition: ActionDefinition | null = null;
  let actionRuns: ActionRunSlim[] = [];
  let activeTab: string = 'runs';
  let argumentsMap: ArgumentsMap = {};
  let code: string = '';
  let codeAbortController: AbortController | null = null;
  let description: string = '';
  let displayedVersions: ActionDefinitionVersion[] = [];
  let filterExpression: string = '';
  let hasUpdatePermission: boolean = false;
  let isDirty: boolean = false;
  let isLoadingCode: boolean = false;
  let lastSyncedActionId: number | null = null;
  let latestNonArchivedVersion: ActionDefinitionVersion | null = null;
  let name: string = '';
  let runsColumnDefs: ColDef<ActionRunSlim>[] = [];
  let saveButtonDisabled: boolean = true;
  let saving: boolean = false;
  let selectedRunId: number | null = null;
  let selectedVersion: ActionDefinitionVersion | null = null;
  let selectedVersionRevision: number | null = null;
  let showArchivedVersions: boolean = false;
  let touchedSettingNames: Set<string> = new Set();
  let uploadFileInput: HTMLInputElement;
  let versionPopoverOpen: boolean = false;

  $: {
    const defs = $actionDefinitionsByWorkspace[$workspaceId] || {};
    actionDefinition = defs[actionDefinitionId] ?? null;
  }

  $: if (actionDefinition) {
    // Reset form values when switching to a different action definition
    if (lastSyncedActionId !== actionDefinition.id) {
      lastSyncedActionId = actionDefinition.id;
      description = actionDefinition.description;
      name = actionDefinition.name;
      argumentsMap = actionDefinition.settings;
      touchedSettingNames = new Set();
      isDirty = false;
      selectedVersionRevision = null;
    }
  }

  $: displayedVersions = showArchivedVersions
    ? (actionDefinition?.versions ?? [])
    : (actionDefinition?.versions ?? []).filter(v => !v.archived);

  $: selectedVersion =
    actionDefinition?.versions.find(v => v.revision === selectedVersionRevision) ?? displayedVersions[0] ?? null;

  $: if (selectedVersion) {
    loadCode(selectedVersion.action_file_id);
  } else {
    code = '';
  }

  $: latestNonArchivedVersion = getLatestRunnableVersion(actionDefinition?.versions ?? []);

  $: settingsSchema = actionDefinition?.versions[0]?.settings_schema ?? {};
  $: requiredSettings = Object.keys(settingsSchema).filter(
    name => settingsSchema[name].required === true,
  ) as RequiredParametersList;

  $: actionRuns = ($actionRunsByWorkspace[$workspaceId] || []).filter(
    run => run.action_definition_id === actionDefinitionId,
  );

  $: hasEmptyRequiredSetting = requiredSettings.some(name => isEmpty(argumentsMap[name]));
  $: saveButtonDisabled = !name || saving || hasEmptyRequiredSetting;

  $: hasUpdatePermission = actionDefinition
    ? featurePermissions.actionDefinition.canUpdate(user, actionDefinition)
    : false;

  onDestroy(() => {
    if (codeAbortController) {
      codeAbortController.abort();
    }
  });

  async function loadCode(fileId: number | undefined) {
    if (codeAbortController) {
      codeAbortController.abort();
    }
    if (fileId === undefined) {
      code = '';
      isLoadingCode = false;
      return;
    }
    codeAbortController = new AbortController();
    isLoadingCode = true;
    code = '';
    const { aborted, file } = await effects.getFile(fileId, user, codeAbortController.signal);
    if (!aborted && typeof file === 'string') {
      code = file;
    }
    isLoadingCode = false;
  }

  async function uploadNewVersion() {
    if (!actionDefinition || !uploadFileInput?.files?.[0]) {
      return;
    }
    const file = uploadFileInput.files[0];
    const success = await effects.createActionDefinitionVersion(file, actionDefinition.id, user);
    uploadFileInput.value = '';
    if (success) {
      selectedVersionRevision = null;
    }
  }

  function checkDirty() {
    isDirty =
      actionDefinition !== null &&
      (name !== actionDefinition.name ||
        description !== actionDefinition.description ||
        JSON.stringify(argumentsMap) !== JSON.stringify(actionDefinition.settings));
    dispatch('dirty', isDirty);
  }

  async function save() {
    if (!actionDefinition || saveButtonDisabled) {
      return;
    }
    saving = true;
    await effects.updateActionDefinition(actionDefinition.id, { description, name, settings: argumentsMap }, user);
    saving = false;
    isDirty = false;
    dispatch('dirty', false);
  }

  async function toggleArchive() {
    if (!actionDefinition) {
      return;
    }
    const action = actionDefinition.archived ? 'unarchive' : 'archive';
    const { confirm } = await showConfirmModal(
      actionDefinition.archived ? 'Unarchive' : 'Archive',
      `Are you sure you want to ${action} "${actionDefinition.name}"?${action === 'archive' ? ' This operation can only be undone by an admin.' : ''}`,
      `${actionDefinition.archived ? 'Unarchive' : 'Archive'} action`,
      true,
    );
    if (!confirm) {
      return;
    }
    await effects.updateActionDefinition(
      actionDefinition.id,
      { archived: !actionDefinition.archived, description: actionDefinition.description, name: actionDefinition.name },
      user,
    );
  }

  async function toggleVersionArchive(
    actionDefinition: ActionDefinition | null,
    version: ActionDefinition['versions'][0],
    user: User | null,
  ) {
    if (!actionDefinition) {
      return;
    }

    const action = version.archived ? 'unarchive' : 'archive';
    const { confirm } = await showConfirmModal(
      version.archived ? 'Unarchive Version' : 'Archive Version',
      `Are you sure you want to ${action} version ${version.revision} of "${actionDefinition.name}"?${action === 'archive' ? ' This operation can only be undone by an admin.' : ''}`,
      `${version.archived ? 'Unarchive' : 'Archive'} Version`,
      true,
    );
    if (!confirm) {
      return;
    }
    await effects.updateActionDefinitionVersion(
      actionDefinition.id,
      version.revision,
      { archived: !version.archived },
      user,
    );
  }

  function onChangeFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    touchedSettingNames = new Set([...touchedSettingNames, formParameter.name]);
    if (formParameter.schema.type === 'options-single') {
      const files = workspaceFiles.find(sequence => sequence.fullPath === formParameter.value);
      formParameter.value = files?.fullPath ?? null;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else if (formParameter.schema.type === 'options-multiple') {
      const values: string[] = formParameter.value;
      const fileNames: string[] = [];
      values.forEach(value => {
        const seq = workspaceFiles.find(sequence => sequence.fullPath === value);
        if (seq !== undefined && seq.fullPath !== undefined) {
          fileNames.push(seq.fullPath);
        }
      });
      formParameter.value = fileNames;
      argumentsMap = getArguments(argumentsMap, formParameter);
    } else {
      argumentsMap = getArguments(argumentsMap, formParameter);
    }
    checkDirty();
  }

  function onResetSettingsParameter(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const { [formParameter.name]: _, ...rest } = argumentsMap;
    argumentsMap = rest;
    checkDirty();
  }

  function resetAllSettings() {
    argumentsMap = {};
    checkDirty();
  }

  function onRunClick() {
    if (actionDefinition) {
      dispatch('runAction', actionDefinition);
    }
  }

  function onRowClicked(event: CustomEvent<{ data: ActionRunSlim; event?: Event | null }>) {
    const { data, event: originalEvent } = event.detail;
    if (data) {
      if (originalEvent && isMetaOrCtrlPressed(originalEvent as MouseEvent)) {
        openActionRun($workspaceId, data.id, true);
      } else {
        dispatch('viewRun', { runId: data.id });
      }
    }
  }

  async function onCancelRun(run: ActionRunSlim) {
    await effects.cancelActionRun(run.id, user);
  }

  // Column definitions for runs DataGrid
  function statusCellRenderer(params: ICellRendererParams<ActionRunSlim>) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.height = '100%';
    if (params.data) {
      const status = getStatusForActionRun(params.data);
      new StatusBadge({ props: { status }, target: div });
    }
    return div;
  }

  function paramsCellRenderer(params: ICellRendererParams<ActionRunSlim>) {
    if (!params.data || !actionDefinition) {
      return '';
    }
    return truncateRunParameters(params.data.parameters, actionDefinition.versions[0]?.parameter_schema);
  }

  function cancelCellRenderer(params: ICellRendererParams<ActionRunSlim>) {
    if (
      !params.data ||
      params.data.canceled ||
      (params.data.status !== 'pending' && params.data.status !== 'incomplete')
    ) {
      return '';
    }
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.height = '100%';
    const btn = document.createElement('button');
    btn.className = 'flex items-center justify-center rounded p-0.5 hover:bg-accent';
    btn.title = 'Cancel Action Run';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (params.data) {
        onCancelRun(params.data);
      }
    });
    div.appendChild(btn);
    return div;
  }

  $: runsColumnDefs = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      sort: 'desc',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 80,
    },
    {
      field: 'action_definition_revision',
      headerName: 'Version',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueFormatter: (params: ValueFormatterParams<ActionRunSlim>) =>
        params.data ? params.data.action_definition_revision : '',
      width: 80,
    },
    {
      cellRenderer: statusCellRenderer,
      field: 'status',
      headerName: 'Status',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 90,
    },
    {
      field: 'requested_by',
      filter: 'text',
      headerName: 'Requested By',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 140,
    },
    {
      field: 'requested_at',
      headerName: 'Requested At',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueFormatter: (params: ValueFormatterParams<ActionRunSlim>) =>
        params.data ? new Date(params.data.requested_at).toLocaleString() : '',
      width: 170,
    },
    {
      field: 'duration',
      headerName: 'Duration',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueFormatter: (params: ValueFormatterParams<ActionRunSlim>) =>
        params.data ? formatMS(params.data.duration) : '',
      width: 100,
    },
    {
      cellRenderer: paramsCellRenderer,
      field: 'parameters',
      filter: 'text',
      headerName: 'Parameters',
      minWidth: 120,
      resizable: true,
      sortable: false,
      valueGetter: (params: { data: ActionRunSlim }) => {
        if (!params.data || !actionDefinition) {
          return '';
        }
        return truncateRunParameters(params.data.parameters, actionDefinition.versions[0]?.parameter_schema);
      },
    },
    {
      cellRenderer: cancelCellRenderer,
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 40,
    },
  ] as ColDef<ActionRunSlim>[];
</script>

{#if actionDefinition}
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
        <div class="flex items-center gap-2">
          <h2 class="truncate text-lg font-bold">{actionDefinition.name}</h2>
          {#if actionDefinition.archived}
            <Badge variant="destructive">Archived</Badge>
          {/if}
        </div>
        {#if actionDefinition.description}
          <p class="truncate text-sm text-muted-foreground">{actionDefinition.description}</p>
        {/if}
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <div
          use:permissionHandler={{
            hasPermission: workspace != null && featurePermissions.actionRun.canCreate(user, workspace),
            permissionError: 'You do not have permission to run an action',
          }}
        >
          <Button on:click={onRunClick} disabled={actionDefinition.archived || !latestNonArchivedVersion}
            >Run Action</Button
          >
        </div>
        <input bind:this={uploadFileInput} accept=".js" class="hidden" on:change={uploadNewVersion} type="file" />
        <div
          use:permissionHandler={{
            hasPermission: hasUpdatePermission,
            permissionError: 'You do not have permission to upload a new version',
          }}
        >
          <Button variant="outline" on:click={() => uploadFileInput?.click()} disabled={actionDefinition.archived}>
            Upload New Version
          </Button>
        </div>
        <Button on:click={() => dispatch('close')} variant="outline">Close</Button>
      </div>
    </div>

    <!-- Tabbed content -->
    <div class="flex-1 overflow-hidden">
      <Tabs.Root bind:value={activeTab} class="flex h-full flex-col">
        <Tabs.List
          class="flex h-[36px] shrink-0 items-center justify-between rounded-none border-b border-border bg-secondary/50 py-0"
        >
          <div class="flex items-center py-0.5">
            <Tabs.Trigger
              value="runs"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-1.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">
                Runs ({actionRuns.length})
              </div>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="configure"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-1.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Configure</div>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="code"
              class="tab-trigger mx-0.5 h-6 border bg-transparent px-1.5 hover:text-neutral-800 data-[state=active]:border data-[state=inactive]:border-transparent data-[state=active]:shadow-none"
            >
              <div class="flex h-2 items-center gap-1 text-xs data-[state=active]:text-neutral-800">Code</div>
            </Tabs.Trigger>
          </div>
          {#if activeTab === 'runs'}
            <div class="flex items-center gap-2 pr-2">
              <InputStellar
                autocomplete="off"
                class="w-48"
                sizeVariant="xs"
                placeholder="Filter runs..."
                bind:value={filterExpression}
              />
            </div>
          {:else if activeTab === 'configure'}
            <div class="flex items-center gap-2 pr-2">
              <div
                use:permissionHandler={{
                  hasPermission: hasUpdatePermission,
                  permissionError: 'You do not have permission to update an action',
                }}
                use:tooltip={{
                  content: hasEmptyRequiredSetting ? 'Please fill in all required settings' : undefined,
                }}
              >
                <Button class="h-6 text-xs" disabled={saveButtonDisabled || !isDirty} on:click={save}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <div
                use:permissionHandler={{
                  hasPermission: hasUpdatePermission,
                  permissionError: 'You do not have permission to archive an action',
                }}
              >
                <Button variant="outline" class="h-6 text-xs text-foreground" on:click={toggleArchive}>
                  {actionDefinition.archived ? 'Unarchive Action' : 'Archive Action'}
                </Button>
              </div>
            </div>
          {:else if activeTab === 'code'}
            <div class="flex items-center gap-2 pr-2">
              <Popover.Root bind:open={versionPopoverOpen}>
                <Popover.Trigger asChild let:builder>
                  <button
                    use:builder.action
                    {...builder}
                    aria-label="Select version"
                    class="flex h-6 items-center gap-1 rounded border border-border bg-white px-2 text-xs hover:bg-accent"
                  >
                    {#if selectedVersion}
                      v{selectedVersion.revision}{selectedVersion === displayedVersions[0] && !selectedVersion.archived
                        ? ' (latest)'
                        : ''}{selectedVersion.archived ? ' (archived)' : ''}
                    {:else}
                      Select version
                    {/if}
                    <ChevronDown size={12} />
                  </button>
                </Popover.Trigger>
                <Popover.Content
                  align="start"
                  avoidCollisions
                  fitViewport
                  class="max-h-64 w-auto min-w-[180px] overflow-y-auto p-1"
                >
                  {#if displayedVersions.length === 0}
                    <div class="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-500">
                      <TriangleAlert size={14} /> No unarchived versions available
                    </div>
                  {/if}
                  {#each displayedVersions as version, i}
                    <button
                      class="flex w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent {version.revision ===
                      selectedVersion?.revision
                        ? 'bg-accent'
                        : ''}"
                      on:click={() => {
                        selectedVersionRevision = version.revision;
                        versionPopoverOpen = false;
                      }}
                    >
                      v{version.revision}{i === 0 && !version.archived ? ' (latest)' : ''}{version.archived
                        ? ' (archived)'
                        : ''}
                    </button>
                  {/each}
                  <hr class="my-1 border-border" />
                  <label class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={showArchivedVersions}
                      on:change={() => {
                        showArchivedVersions = !showArchivedVersions;
                      }}
                      class="h-3.5 w-3.5"
                    />
                    Show archived versions
                  </label>
                </Popover.Content>
              </Popover.Root>
              {#if selectedVersion}
                <span class="text-xs text-muted-foreground">
                  Author:
                  {selectedVersion.author ?? 'Unknown'} • Created: {new Date(
                    selectedVersion.created_at,
                  ).toLocaleDateString()}
                </span>
              {/if}

              {#if selectedVersion && (selectedVersion.archived || actionDefinition.versions.filter(v => !v.archived && v !== selectedVersion).length > 0)}
                <Button
                  variant="outline"
                  class="h-6 text-xs text-foreground"
                  disabled={!hasUpdatePermission}
                  on:click={() => toggleVersionArchive(actionDefinition, selectedVersion, user)}
                >
                  {selectedVersion.archived ? 'Unarchive Version' : 'Archive Version'}
                </Button>
              {/if}
            </div>
          {/if}
        </Tabs.List>

        <!-- Runs tab -->
        <Tabs.Content value="runs" class="mt-0 flex-1 overflow-hidden">
          <div class="h-full p-2">
            {#if actionRuns.length === 0}
              <div class="flex h-full items-center justify-center text-xs text-muted-foreground">
                No runs for this action yet
              </div>
            {:else}
              <SingleActionDataGrid
                columnDefs={runsColumnDefs}
                {filterExpression}
                items={actionRuns}
                itemDisplayText="Action Run"
                {user}
                selectedItemId={selectedRunId}
                hasDeletePermission={false}
                hasEdit={false}
                on:rowClicked={onRowClicked}
              />
            {/if}
          </div>
        </Tabs.Content>

        <!-- Configure tab -->
        <Tabs.Content value="configure" class="mt-0 flex-1 overflow-y-auto">
          <div class="mx-auto flex max-w-2xl flex-col gap-4 p-6">
            <SectionCard title="Action Metadata">
              <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {#if actionDefinition.owner}
                  <span>Owner: <span class="text-foreground">{actionDefinition.owner}</span></span>
                {/if}
                <span>
                  Updated: <span class="text-foreground"
                    >{new Date(actionDefinition.updated_at).toLocaleDateString()}</span
                  >
                </span>
                {#if latestNonArchivedVersion}
                  <span>
                    Latest Version: <span class="text-foreground">v{latestNonArchivedVersion.revision}</span>
                  </span>
                {/if}
              </div>
              <Input layout="inline">
                <label for="action-name">Name</label>
                <input
                  bind:value={name}
                  autocomplete="off"
                  class="st-input w-100"
                  id="action-name"
                  on:input={checkDirty}
                  required
                  type="text"
                  placeholder="Enter a name"
                  use:permissionHandler={{
                    hasPermission: hasUpdatePermission,
                    permissionError: 'You do not have permission to update an action',
                  }}
                />
              </Input>

              <Input layout="inline">
                <label for="action-description">Description</label>
                <textarea
                  bind:value={description}
                  autocomplete="off"
                  class="st-input w-100"
                  id="action-description"
                  on:input={checkDirty}
                  required
                  placeholder="Enter a description"
                  use:permissionHandler={{
                    hasPermission: hasUpdatePermission,
                    permissionError: 'You do not have permission to update an action',
                  }}
                />
              </Input>
            </SectionCard>

            <SectionCard title="Action Settings">
              <svelte:fragment slot="actions">
                {#if Object.keys(argumentsMap).length > 0}
                  <Button
                    variant="outline"
                    class="shrink-0 text-xs"
                    disabled={!hasUpdatePermission}
                    on:click={resetAllSettings}
                  >
                    Reset All
                  </Button>
                {/if}
              </svelte:fragment>
              <p class="text-xs text-muted-foreground">Persistent settings provided to every run of this action</p>
              {#if Object.keys(actionDefinition.versions[0]?.settings_schema ?? {}).length < 1}
                <p class="text-xs italic text-muted-foreground">No settings defined</p>
              {:else}
                <Parameters
                  formParameters={applyRequiredErrors(
                    getFormParameters(
                      valueSchemaRecordToParametersMap(actionDefinition.versions[0]?.settings_schema ?? {}),
                      argumentsMap,
                      requiredSettings,
                      undefined,
                      getDefaultsFromSchema(actionDefinition.versions[0]?.settings_schema ?? {}),
                      getUserSequenceValueSchemaOptions(workspaceFiles, $workspaceId),
                      'sequence',
                      undefined,
                      false,
                    ),
                    touchedSettingNames,
                  )}
                  parameterType="action"
                  hideInfo={false}
                  on:change={onChangeFormParameters}
                  on:reset={onResetSettingsParameter}
                  use={[
                    [
                      permissionHandler,
                      {
                        hasPermission: hasUpdatePermission,
                        permissionError: 'You do not have permission to update an action',
                      },
                    ],
                  ]}
                />
              {/if}
            </SectionCard>

            <!-- Versions section -->
            <SectionCard title="Versions" flush>
              <label slot="actions" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" bind:checked={showArchivedVersions} class="h-3.5 w-3.5" />
                Show archived
              </label>
              {#if displayedVersions.length === 0}
                <p class="px-4 py-3 text-xs italic text-muted-foreground">No versions</p>
              {:else}
                <div class="divide-y divide-border">
                  {#each displayedVersions as version, i (version.revision)}
                    <div
                      class="flex items-center justify-between px-4 py-2 text-xs {version.archived ? 'opacity-50' : ''}"
                    >
                      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span class="font-medium">
                          v{version.revision}
                          {#if i === 0 && !version.archived}
                            <span class="text-muted-foreground">(latest)</span>
                          {/if}
                        </span>
                        <span class="text-muted-foreground">
                          Author: <span class="text-foreground">{version.author ?? 'Unknown'}</span>
                        </span>
                        <span class="text-muted-foreground">
                          Created: <span class="text-foreground"
                            >{new Date(version.created_at).toLocaleDateString()}</span
                          >
                        </span>
                        {#if version.archived}
                          <Badge variant="destructive">Archived</Badge>
                        {/if}
                      </div>
                      {#if version.archived || actionDefinition.versions.filter(v => !v.archived && v !== version).length > 0}
                        <div
                          use:permissionHandler={{
                            hasPermission: hasUpdatePermission,
                            permissionError: 'You do not have permission to archive a version',
                          }}
                        >
                          <Button
                            variant="outline"
                            class="h-6 shrink-0 text-xs"
                            disabled={!hasUpdatePermission}
                            on:click={() => toggleVersionArchive(actionDefinition, version, user)}
                          >
                            {version.archived ? 'Unarchive Version' : 'Archive Version'}
                          </Button>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </SectionCard>
          </div>
        </Tabs.Content>

        <!-- Code tab -->
        <Tabs.Content value="code" class="mt-0 flex-1 overflow-hidden">
          <MonacoEditor
            automaticLayout={true}
            language="javascript"
            lineNumbers="on"
            minimap={{ enabled: false }}
            readOnly={true}
            scrollBeyondLastLine={false}
            tabSize={2}
            value={isLoadingCode ? 'Loading...' : code}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </div>
{:else}
  <div class="flex h-full items-center justify-center text-sm text-muted-foreground">Action not found</div>
{/if}
