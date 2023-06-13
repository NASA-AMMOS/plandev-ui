<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import BarChartIcon from 'bootstrap-icons/icons/bar-chart.svg?component';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import { createModelError, creatingModel, models } from '../../stores/plan';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { ModelSlim } from '../../types/model';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deleteModel: (model: ModelSlim) => void;
  };
  type ModelCellRendererParams = ICellRendererParams<ModelSlim> & CellRendererParams;

  const creationPermissionError: string = 'You do not have permission to upload a model';
  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    { field: 'owner', filter: 'text', headerName: 'Owner', resizable: true, sortable: true },
    {
      field: 'created_at',
      filter: 'text',
      headerName: 'Date Created',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ModelSlim>) => {
        if (params.data?.created_at) {
          return new Date(params.data?.created_at).toISOString().slice(0, 19);
        }
      },
    },
    { field: 'description', filter: 'text', headerName: 'Description', resizable: true, sortable: true },
    { field: 'version', filter: 'number', headerName: 'Version', sortable: true, width: 120 },
  ];

  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let createButtonDisabled: boolean = false;
  let files: FileList;
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let name = '';
  let user: User | null = null;
  let version = '';
  let description = '';

  $: createButtonDisabled = !files || name === '' || version === '' || $creatingModel === true;
  $: {
    user = data.user;
    hasCreatePermission = featurePermissions.model.canCreate(user);
    hasDeletePermission = featurePermissions.model.canDelete(user);
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: ModelCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              deleteCallback: params.deleteModel,
              deleteTooltip: {
                content: 'Delete Model',
                placement: 'bottom',
              },
              hasDeletePermission,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteModel,
        } as CellRendererParams,
        field: 'actions',
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 25,
      },
    ];
  }

  onMount(() => {
    models.updateValue(() => data.initialModels);
  });

  function deleteModel(model: ModelSlim) {
    effects.deleteModel(model, user);
  }

  function deleteModelContext(event: CustomEvent<RowId[]>) {
    const selectedModelId = event.detail[0] as number;
    const modelToDelete = $models.find((model: ModelSlim) => model.id === selectedModelId);
    if (modelToDelete) {
      deleteModel(modelToDelete);
    }
  }

  function showModel(model: ModelSlim) {
    goto(`${base}/plans?modelId=${model.id}`);
  }

  async function submitForm(e: SubmitEvent) {
    await effects.createModel(name, version, files, data.user, description);
    if ($createModelError === null && e.target instanceof HTMLFormElement) {
      e.target.reset();
    }
  }
</script>

<PageTitle title="Models" />

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span slot="title">Models</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <SectionTitle>New Model</SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={submitForm}>
          <AlertError class="m-2" error={$createModelError} />

          <fieldset>
            <label for="name">Name</label>
            <input
              bind:value={name}
              autocomplete="off"
              class="st-input w-100"
              name="name"
              required
              use:permissionHandler={{
                hasPermission: hasCreatePermission,
                permissionError: creationPermissionError,
              }}
            />
          </fieldset>

          <fieldset>
            <label for="version">Version</label>
            <input
              bind:value={version}
              autocomplete="off"
              class="st-input w-100"
              name="version"
              placeholder="0.0.0"
              required
              use:permissionHandler={{
                hasPermission: hasCreatePermission,
                permissionError: creationPermissionError,
              }}
            />
          </fieldset>

          <fieldset>
            <label for="description">Description</label>
            <textarea
              bind:value={description}
              autocomplete="off"
              class="st-input w-100"
              name="description"
              placeholder="Enter Model Description (optional)"
            />
          </fieldset>

          <fieldset>
            <label for="file">Jar File</label>
            <input
              class="w-100"
              name="file"
              required
              type="file"
              bind:files
              use:permissionHandler={{
                hasPermission: hasCreatePermission,
                permissionError: creationPermissionError,
              }}
            />
          </fieldset>

          <fieldset>
            <button class="st-button w-100" disabled={createButtonDisabled} type="submit">
              {$creatingModel ? 'Creating...' : 'Create'}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>
          <BarChartIcon />
          Models
        </SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $models.length}
          <SingleActionDataGrid
            {columnDefs}
            {hasDeletePermission}
            itemDisplayText="Model"
            items={$models}
            {user}
            on:deleteItem={deleteModelContext}
            on:rowClicked={({ detail }) => showModel(detail.data)}
          />
        {:else}
          No Models Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
