<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar } from '@nasa-jpl/stellar-svelte';
  import type { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { actionDefinitionsByWorkspace, actionRuns, actionRunsByWorkspace } from '../../../stores/actions';
  import { workspaceId } from '../../../stores/workspaces';
  import type { ActionRunSlim } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import {
    getActionDefinitionForRun,
    getStatusForActionRun,
    openActionRun,
    truncateRunParameters,
  } from '../../../utilities/actions';
  import effects from '../../../utilities/effects';
  import { isMetaOrCtrlPressed } from '../../../utilities/keyboardEvents';
  import { formatMS } from '../../../utilities/time';
  import AsyncContentState from '../../ui/AsyncContentState.svelte';
  import SingleActionDataGrid from '../../ui/DataGrid/SingleActionDataGrid.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  const actionRunsError = actionRuns.error;
  const actionRunsLoading = actionRuns.loading;

  export let user: User | null;

  const dispatch = createEventDispatcher<{
    viewRun: { runId: number };
  }>();

  let filterExpression: string = '';
  let selectedRunId: number | null = null;

  $: workspaceActionRuns = $actionRunsByWorkspace[$workspaceId] || [];

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

  function actionNameValueGetter(params: { data: ActionRunSlim }) {
    if (!params.data) {
      return '';
    }
    const def = getActionDefinitionForRun(params.data, $actionDefinitionsByWorkspace, $workspaceId);
    return def?.name ?? 'Deleted Action';
  }

  function paramsCellRenderer(params: ICellRendererParams<ActionRunSlim>) {
    if (!params.data) {
      return '';
    }
    const def = getActionDefinitionForRun(params.data, $actionDefinitionsByWorkspace, $workspaceId);
    return truncateRunParameters(params.data.parameters, def?.versions[0]?.parameter_schema);
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
        effects.cancelActionRun(params.data.id, user);
      }
    });
    div.appendChild(btn);
    return div;
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

  $: columnDefs = [
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
      filter: 'text',
      headerName: 'Action',
      sortable: true,
      valueGetter: actionNameValueGetter,
      width: 140,
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
      filter: 'text',
      headerName: 'Status',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
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
        if (!params.data) {
          return '';
        }
        const def = getActionDefinitionForRun(params.data, $actionDefinitionsByWorkspace, $workspaceId);
        return truncateRunParameters(params.data.parameters, def?.versions[0]?.parameter_schema);
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

<div class="flex h-full flex-col overflow-hidden">
  <!-- Header -->
  <div class="flex items-center gap-2 border-b border-border px-4 py-3">
    <SectionTitle>All Action Runs</SectionTitle>
    <div class="w-48">
      <InputStellar
        autocomplete="off"
        class="w-full"
        sizeVariant="xs"
        placeholder="Filter runs..."
        bind:value={filterExpression}
      />
    </div>
  </div>

  <!-- DataGrid -->
  <div class="flex-1 overflow-hidden p-2">
    <AsyncContentState
      loading={$actionRunsLoading}
      error={$actionRunsError || null}
      errorMessage="Failed to load action runs"
      showRetry
      on:retry={() => actionRuns.restartSocket()}
    >
      <SingleActionDataGrid
        {columnDefs}
        {filterExpression}
        items={workspaceActionRuns}
        itemDisplayText="Action Run"
        {user}
        selectedItemId={selectedRunId}
        noRowsOverlayText="No Action Runs Found"
        hasDeletePermission={false}
        hasEdit={false}
        on:rowClicked={onRowClicked}
      />
    </AsyncContentState>
  </div>
</div>
