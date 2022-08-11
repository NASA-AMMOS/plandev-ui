<script lang="ts" context="module">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';
  import { onMount } from 'svelte';
  import Nav from '../../components/app/Nav.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGrid from '../../components/ui/DataGrid.svelte';
  import DataGridActions from '../../components/ui/DataGridActions.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import { createModelError, creatingModel, models, sortedModels } from '../../stores/plan';
  import effects from '../../utilities/effects';

  export const load: Load = async ({ session }) => {
    if (!session.user) {
      return {
        redirect: `${base}/login`,
        status: 302,
      };
    }

    const initialModels = await effects.getModels();

    return {
      props: {
        initialModels,
      },
    };
  };
</script>

<script lang="ts">
  export let initialModels: ModelList[] = [];

  type CellRendererParams = {
    deleteModel: (model: ModelList) => void;
  };
  type ModelCellRendererParams = ICellRendererParams & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    { field: 'name', headerName: 'Name', resizable: true, sortable: true },
    {
      field: 'id',
      headerName: 'Model ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
    { field: 'version', headerName: 'Version', sortable: true, width: 120 },
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
    models.updateValue(() => initialModels);
  });

  function deleteModel(model: ModelList) {
    effects.deleteModel(model);
  }

  function showModel(model: ModelList) {
    goto(`${base}/plans?modelId=${model.id}`);
  }
</script>

<CssGrid rows="42px calc(100vh - 42px)">
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
          <i class="bi bi-bar-chart" />
          Models
        </Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $sortedModels.length}
          <DataGrid
            {columnDefs}
            highlightOnSelection={false}
            rowData={$sortedModels}
            rowSelection="single"
            on:rowSelected={({ detail }) => showModel(detail.data)}
          />
        {:else}
          No Models Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
