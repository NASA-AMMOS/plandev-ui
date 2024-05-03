<svelte:options immutable={true} />

<script lang="ts">
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { Association, AssociationSpecificationMap, BaseMetadata } from '../../types/metadata';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import Input from '../form/Input.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../ui/DataGrid/DataGridTags';

  export let hasCreatePermission: boolean = false;
  export let hasEditSpecPermission: boolean = false;
  export let metadataList: Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[] = [];
  export let metadataType: Association = 'constraint';
  export let selectedSpecifications: AssociationSpecificationMap = {};
  export let selectedSpecification: { id: number; revision: number | null } | null = null;

  type CellRendererParams = {
    viewMetadata: (metadata: BaseMetadata) => void;
  };
  type MetadataCellRendererParams = ICellRendererParams<BaseMetadata> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    newMetadata: void;
    selectSpecification: {
      id: number;
      revision: number;
    } | null;
    toggleSpecification: {
      id: number;
      selected: boolean;
    };
    viewMetadata: number;
  }>();
  const baseColumnDefs: DataGridColumnDef<BaseMetadata>[] = [
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
    { field: 'name', filter: 'text', headerName: 'Name', minWidth: 80, resizable: true, sortable: true },
    {
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 80,
    },
    {
      field: 'updated_by',
      filter: 'string',
      headerName: 'Updated By',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 120,
    },
    {
      field: 'versions',
      filter: 'string',
      headerName: 'Latest',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<BaseMetadata>) => {
        return params?.data?.versions[0].revision;
      },
      width: 80,
    },
    {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      field: 'tags',
      filter: 'text',
      filterValueGetter: tagsFilterValueGetter,
      headerName: 'Tags',
      resizable: true,
      sortable: false,
      width: 220,
      wrapText: true,
    },
  ];
  const permissionError = `You do not have permission to add this ${metadataType}.`;

  let columnDefs = baseColumnDefs;
  let dataGrid: DataGrid<Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>> | undefined = undefined;
  let filterText: string = '';
  let filteredMetadata: Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[] = [];
  let formattedType: string = '';

  $: formattedType = `${metadataType.charAt(0).toUpperCase()}${metadataType.slice(1)}`;
  $: filteredMetadata = metadataList.filter(metadata => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${metadata.id}`.includes(filterTextLowerCase);
    const includesName = metadata.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: {
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: MetadataCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              rowData: params.data,
              viewCallback: params.viewMetadata,
              viewTooltip: {
                content: `View ${formattedType}`,
                placement: 'bottom',
              },
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          viewMetadata: onViewMetadata,
        } as CellRendererParams,
        headerName: '',
        resizable: false,
        sortable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        width: 20,
      },
      {
        cellDataType: 'boolean',
        editable: hasEditSpecPermission,
        headerName: '',
        resizable: false,
        suppressAutoSize: true,
        suppressSizeToFit: true,
        valueGetter: (params: ValueGetterParams<BaseMetadata>) => {
          const { data } = params;
          if (data) {
            return !!selectedSpecifications[data.id]?.selected;
          }
          return false;
        },
        width: 35,
      },
    ];
  }
  $: if (selectedSpecifications) {
    dataGrid?.redrawRows();
  }

  function onNewMetadata() {
    dispatch('newMetadata');
  }

  function onSelectDefinition(event: CustomEvent<Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[]>) {
    const { detail: selectedMetadata } = event;
    if (selectedMetadata.length > 0) {
      dispatch('selectSpecification', {
        id: selectedMetadata[0].id,
        revision: selectedMetadata[0].versions[0].revision,
      });
    } else {
      dispatch('selectSpecification', null);
    }
  }

  function onViewMetadata({ id }: Pick<BaseMetadata, 'id'>) {
    dispatch('viewMetadata', id);
  }

  function onToggleSpecification(
    event: CustomEvent<CellEditingStoppedEvent<Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>, boolean>>,
  ) {
    const {
      detail: { data, newValue },
    } = event;

    if (data) {
      dispatch('toggleSpecification', {
        id: data.id,
        selected: !!newValue,
      });
    }
  }
</script>

<div class="metadata-container">
  <div class="metadata-filter-container">
    <div class="st-typography-bold">{formattedType}s</div>
    <Input>
      <input bind:value={filterText} class="st-input" placeholder={`Filter ${metadataType}s`} style="width: 100%;" />
    </Input>
    <button
      class="st-button secondary ellipsis"
      use:permissionHandler={{
        hasPermission: hasCreatePermission,
        permissionError,
      }}
      on:click={onNewMetadata}
    >
      New
    </button>
  </div>
  <hr />
  <div class="metadata-table-container">
    {#if filteredMetadata.length}
      <DataGrid
        bind:this={dataGrid}
        {columnDefs}
        rowData={filteredMetadata}
        rowSelection="single"
        selectedRowIds={selectedSpecification ? [selectedSpecification.id] : []}
        on:cellEditingStopped={onToggleSpecification}
        on:selectionChanged={onSelectDefinition}
      />
    {:else}
      <div class="p1 st-typography-label">No {formattedType}s Found</div>
    {/if}
  </div>
</div>

<style>
  .metadata-container {
    display: grid;
    grid-template-rows: min-content min-content auto;
    row-gap: 0.5rem;
  }

  .metadata-container hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0 1rem;
    width: auto;
  }

  .metadata-filter-container {
    align-items: center;
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: min-content auto min-content;
    margin: 0.5rem 1rem 0;
  }

  .metadata-table-container {
    padding: 0 1rem 0.5rem;
    width: 100%;
  }
</style>
