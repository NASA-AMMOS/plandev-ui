<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import BarChartIcon from 'bootstrap-icons/icons/bar-chart.svg?component';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import { createModelError, creatingModel, models } from '../../stores/plan';
  import effects from '../../utilities/effects';
  import type { PageData } from './$types';

  export let data: PageData;

  type CellRendererParams = {
    deleteModel: (model: ModelSlim) => void;
  };
  type ModelCellRendererParams = ICellRendererParams<ModelSlim> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
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
    { field: 'version', filter: 'number', headerName: 'Version', sortable: true, width: 120 },
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

  let createButtonDisabled: boolean = false;
  let files: FileList;
  let name = '';
  let version = '';

  $: createButtonDisabled = !files || name === '' || version === '';

  onMount(() => {
    models.updateValue(() => data.initialModels);
  });

  function deleteModel(model: ModelSlim) {
    effects.deleteModel(model);
  }

  function deleteModelContext(event: CustomEvent<number[]>) {
    const selectedModelId = event.detail[0];
    const modelToDelete = $models.find((model: ModelSlim) => model.id === selectedModelId);
    deleteModel(modelToDelete);
  }

  function showModel(model: ModelSlim) {
    goto(`${base}/plans?modelId=${model.id}`);
  }
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span slot="title">Models</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Model</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={() => effects.createModel(name, version, files)}>
          <AlertError class="m-2" error={$createModelError} />

          <fieldset>
            <label for="name">Name</label>
            <input bind:value={name} autocomplete="off" class="st-input w-100" name="name" required />
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
            />
          </fieldset>

          <fieldset>
            <label for="file">Jar File</label>
            <input class="w-100" name="file" required type="file" bind:files />
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
        <Chip>
          <BarChartIcon />
          Models
        </Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $models.length}
          <SingleActionDataGrid
            {columnDefs}
            itemDisplayText="Model"
            items={$models}
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
