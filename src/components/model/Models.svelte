<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import BarChartIcon from 'bootstrap-icons/icons/bar-chart.svg?component';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { onDestroy } from 'svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import { createModelError, creatingModel, models, resetModelStores } from '../../stores/model';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { ModelSlim } from '../../types/model';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import ModelId from './ModelId.svelte';
  import ModelStatusRollup from './ModelStatusRollup.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteModel: (model: ModelSlim) => void;
    editModel: (model: ModelSlim) => void;
  };
  type ModelCellRendererParams = ICellRendererParams<ModelSlim> & CellRendererParams;
  type ModelIdCellRendererParams = ICellRendererParams<ModelSlim>;

  const createModelPermissionError: string = 'You do not have permission to upload a model';
  const updateModelPermissionError: string = 'You do not have permission to update this model';
  const createPlanPermissionError: string = 'You do not have permission to create a plan';

  const baseColumnDefs: DataGridColumnDef[] = [
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
  let description = '';
  let files: FileList | undefined;
  let hasCreateModelPermission: boolean = false;
  let hasCreatePlanPermission: boolean = false;
  let hasDeleteModelPermission: boolean = false;
  let hasUpdateModelPermission: boolean = false;
  let name = '';
  let selectedModel: ModelSlim | null = null;
  let version = '';

  $: createButtonDisabled = !files || name === '' || version === '' || $creatingModel === true;
  $: {
    hasCreateModelPermission = featurePermissions.model.canCreate(user);
    hasCreatePlanPermission = featurePermissions.plan.canCreate(user);
    hasDeleteModelPermission = featurePermissions.model.canDelete(user);
    hasUpdateModelPermission = featurePermissions.model.canUpdate(user);
    columnDefs = [
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: ModelIdCellRendererParams) => {
          const modelIdDiv = document.createElement('div');
          modelIdDiv.className = 'model-id-cell';
          new ModelId({
            props: {
              model: params.data,
            },
            target: modelIdDiv,
          });

          return modelIdDiv;
        },
        field: 'id',
        filter: 'number',
        headerName: 'ID',
        resizable: true,
        sortable: true,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 75,
      },
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
              editCallback: params.editModel,
              editTooltip: {
                content: 'Edit Model',
                placement: 'bottom',
              },
              hasDeletePermission: hasDeleteModelPermission,
              hasEditPermission: hasUpdateModelPermission,
              rowData: params.data,
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteModel,
          editModel,
        } as CellRendererParams,
        field: 'actions',
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 55,
      },
    ];
  }

  onDestroy(() => {
    resetModelStores();
  });

  function createPlanWithModel() {
    if (selectedModel) {
      goto(`${base}/plans?modelId=${selectedModel.id}`);
    }
  }

  function editModel(model: ModelSlim) {
    goto(`${base}/models/${model.id}`);
  }

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

  function editModelContext(event: CustomEvent<RowId[]>) {
    const selectedModelId = event.detail[0] as number;
    const modelToDelete = $models.find((model: ModelSlim) => model.id === selectedModelId);
    if (modelToDelete) {
      editModel(modelToDelete);
    }
  }

  function deselectModel() {
    selectModel(null);
  }

  function onEditModel() {
    if (selectedModel) {
      editModel(selectedModel);
    }
  }

  function selectModel(model: ModelSlim | null) {
    selectedModel = model;
  }

  async function submitForm(e: SubmitEvent) {
    if (files) {
      const newModelId = await effects.createModel(name, version, files, user, description);
      if ($createModelError === null && e.target instanceof HTMLFormElement) {
        goto(`${base}/models/${newModelId}`);
      }
    }
  }
</script>

<PageTitle title="Models" />

<CssGrid columns="20% auto">
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{selectedModel ? selectedModel.name : 'New Model'}</SectionTitle>
      {#if selectedModel}
        <button
          class="st-button icon fs-6"
          on:click={deselectModel}
          use:tooltip={{ content: 'Deselect model', placement: 'top' }}
        >
          <XIcon />
        </button>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#if selectedModel}
        <div class="model-metadata">
          <fieldset>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="name">Model name</label>
              <input
                disabled
                class="st-input w-100"
                name="name"
                use:tooltip={{ content: name, placement: 'top' }}
                value={selectedModel.name}
              />
            </Input>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="id">Model id</label>
              <input disabled class="st-input w-100" name="id" value={selectedModel.id} />
            </Input>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="description">Description</label>
              <textarea disabled class="st-input w-100" name="description" value={selectedModel.description} />
            </Input>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="version">Model version</label>
              <input disabled class="st-input w-100" name="version" value={selectedModel.version} />
            </Input>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="owner">Owner</label>
              <input disabled class="st-input w-100" name="owner" value={selectedModel.owner} />
            </Input>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="created">Date Created</label>
              <input
                disabled
                class="st-input w-100"
                name="created"
                value={getShortISOForDate(new Date(selectedModel.created_at))}
              />
            </Input>
            <Input layout="inline">
              <label class="model-metadata-item-label" for="status">Jar file status</label>
              <ModelStatusRollup mode="rollup" model={selectedModel} />
            </Input>
            <div class="model-status-full"><ModelStatusRollup mode="full" model={selectedModel} /></div>
          </fieldset>
        </div>
        <div class="model-buttons">
          <button
            class="st-button secondary w-100"
            on:click={createPlanWithModel}
            use:permissionHandler={{
              hasPermission: hasCreatePlanPermission,
              permissionError: createPlanPermissionError,
            }}
          >
            New plan with model
          </button>
          <button
            class="st-button w-100"
            on:click={onEditModel}
            use:permissionHandler={{
              hasPermission: hasUpdateModelPermission,
              permissionError: updateModelPermissionError,
            }}
          >
            Edit details and associations
          </button>
        </div>
      {:else}
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
                hasPermission: hasCreateModelPermission,
                permissionError: createModelPermissionError,
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
                hasPermission: hasCreateModelPermission,
                permissionError: createModelPermissionError,
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
                hasPermission: hasCreateModelPermission,
                permissionError: createModelPermissionError,
              }}
            />
          </fieldset>

          <fieldset>
            <button
              class="st-button w-100"
              disabled={createButtonDisabled}
              type="submit"
              use:permissionHandler={{
                hasPermission: hasCreateModelPermission,
                permissionError: createModelPermissionError,
              }}
            >
              {$creatingModel ? 'Creating...' : 'Create'}
            </button>
          </fieldset>
        </form>
      {/if}
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
          columnsToForceRefreshOnDataUpdate={['id']}
          hasEdit={hasUpdateModelPermission}
          hasEditPermission={hasUpdateModelPermission}
          hasDeletePermission={hasDeleteModelPermission}
          itemDisplayText="Model"
          items={$models}
          {user}
          selectedItemId={selectedModel?.id ?? null}
          on:deleteItem={deleteModelContext}
          on:editItem={editModelContext}
          on:rowClicked={({ detail }) => selectModel(detail.data)}
        />
      {:else}
        No Models Found
      {/if}
    </svelte:fragment>
  </Panel>
</CssGrid>

<style>
  .model-metadata input:disabled,
  .model-metadata textarea:disabled {
    opacity: 1;
  }

  .model-metadata-item-label {
    white-space: nowrap;
  }

  .model-buttons {
    display: flex;
    flex-flow: column;
    padding: 8px;
    row-gap: 8px;
  }

  .model-status-full {
    margin: 8px 0;
  }
</style>
