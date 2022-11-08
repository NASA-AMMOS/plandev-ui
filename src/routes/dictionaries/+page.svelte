<svelte:options immutable={true} />

<script lang="ts">
  import Nav from '../../components/app/Nav.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import Chip from '../../components/ui/Chip.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import DataGridActions from '../../components/ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../../components/ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import { createDictionaryError, creatingDictionary } from '../../stores/expansion';
  import { commandDictionaries } from '../../stores/sequencing';
  import effects from '../../utilities/effects';

  type CellRendererParams = {
    deleteCommandDictionary: (dictionary: CommandDictionary) => void;
  };
  type CommandDictionaryCellRendererParams = ICellRendererParams<CommandDictionary> & CellRendererParams;

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
    { field: 'mission', filter: 'text', headerName: 'Mission', sortable: true, width: 100 },
    { field: 'version', filter: 'text', headerName: 'Version', sortable: true, suppressAutoSize: true, width: 100 },
    {
      field: 'command_types_typescript_path',
      filter: 'text',
      headerName: 'Types Path',
      resizable: true,
      sortable: true,
      width: 220,
    },
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: CommandDictionaryCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteCommandDictionary,
            deleteTooltip: {
              content: 'Delete Command Dictionary',
              placement: 'bottom',
            },
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteCommandDictionary,
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

  $: createButtonDisabled = !files;

  function deleteCommandDictionary({ id }: Pick<CommandDictionary, 'id'>) {
    effects.deleteCommandDictionary(id);
  }

  function deleteCommandDictionaryContext(event: CustomEvent<number[]>) {
    deleteCommandDictionary({ id: event.detail[0] });
  }
</script>

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav>
    <span slot="title">Command Dictionaries</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <Chip>New Command Dictionary</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={() => effects.createCommandDictionary(files)}>
          <AlertError class="m-2" error={$createDictionaryError} />

          <fieldset>
            <label for="file">AMPCS Command Dictionary XML File</label>
            <input class="w-100 st-typography-body" name="file" required type="file" bind:files />
          </fieldset>

          <fieldset>
            <button class="st-button w-100" disabled={createButtonDisabled} type="submit">
              {$creatingDictionary ? 'Creating...' : 'Create'}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <Panel>
      <svelte:fragment slot="header">
        <Chip>Command Dictionaries</Chip>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if $commandDictionaries.length}
          <SingleActionDataGrid
            {columnDefs}
            itemDisplayText="Command Dictionary"
            items={$commandDictionaries}
            on:deleteItem={deleteCommandDictionaryContext}
          />
        {:else}
          No Command Dictionaries Found
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>
</CssGrid>
