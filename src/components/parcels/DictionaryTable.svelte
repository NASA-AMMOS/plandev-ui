<svelte:options immutable={true} />

<script lang="ts">
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { DictionaryType } from '../../types/sequencing';
  import { featurePermissions } from '../../utilities/permissions';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let dictionaries: DictionaryType[];
  // Used when the table is in single select mode.
  export let dictionaryId: number | null = null;
  // Used when the table is in multiselect mode.
  export let multiSelectDictionaryIds: Record<number, boolean> = {};
  export let isEditingParcel: boolean = false;
  export let isMultiselect: boolean = false;
  export let hasEditPermission: boolean = false;
  export let type: string;
  export let user: User | null;

  let dictionaryDataGrid: SingleActionDataGrid<DictionaryType> | undefined = undefined;
  let dictionaryColumnDefs: DataGridColumnDef[];
  let displayText: string = '';
  let displayTextPlural: string = '';
  let editingColumnDefs: DataGridColumnDef[];
  let hasDeletePermission: boolean = false;
  let isSequenceAdaptation: boolean = false;
  let sequenceAdaptationColumDefs: DataGridColumnDef[];

  const dispatch = createEventDispatcher<{
    delete: { id: number };
    multiSelect: { ids: Record<number, boolean> };
    select: { id: number | null };
  }>();

  type CellRendererParams = {
    deleteDictionary?: (dictionary: DictionaryType) => void;
  };
  type DictionaryCellRendererParams = ICellRendererParams<DictionaryType> & CellRendererParams;

  $: isSequenceAdaptation = type === 'Sequence';
  $: displayText = isSequenceAdaptation ? `${type} Adaptation` : `${type} Dictionary`;
  $: displayTextPlural = isSequenceAdaptation ? `${type} Adaptations` : `${type} Dictionaries`;
  $: hasDeletePermission = featurePermissions.commandDictionary.canDelete(user);

  $: if ((multiSelectDictionaryIds || dictionaryId) && dictionaryDataGrid?.redrawRows !== undefined) {
    dictionaryDataGrid.redrawRows();
  }

  $: editingColumnDefs = [
    {
      cellDataType: 'boolean',
      editable: hasEditPermission,
      headerName: '',
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<DictionaryType>) => {
        const { data } = params;
        if (data) {
          if (isMultiselect) {
            return !!multiSelectDictionaryIds[data.id];
          }

          return dictionaryId === data.id;
        }
        return false;
      },
      width: 35,
    },
  ];

  $: dictionaryColumnDefs = [
    ...(isEditingParcel ? editingColumnDefs : []),
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
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
  ];

  $: sequenceAdaptationColumDefs = [
    ...(isEditingParcel ? editingColumnDefs : []),
    { field: 'name', filter: 'text', headerName: 'Name', sortable: true, width: 100 },
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
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
  ];

  $: columnDefs = [
    ...(isSequenceAdaptation ? sequenceAdaptationColumDefs : dictionaryColumnDefs),
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: DictionaryCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteDictionary,
            deleteTooltip: {
              content: `Delete ${displayText}`,
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
        deleteDictionary,
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

  function deleteDictionary({ id }: Pick<DictionaryType, 'id'>) {
    dispatch('delete', { id });
  }

  function deleteDictionaryContext(event: CustomEvent<RowId[]>) {
    deleteDictionary({ id: event.detail[0] as number });
  }

  function onRowClicked(event: CustomEvent<DataGridRowSelection<DictionaryType>>) {
    selectRow(event.detail.data.id, true);
  }

  function onToggle(event: CustomEvent<CellEditingStoppedEvent<DictionaryType, boolean>>) {
    const {
      detail: { data, newValue },
    } = event;

    if (data) {
      selectRow(data.id, newValue as boolean);
    }
  }

  function selectRow(id: number, newValue: boolean) {
    if (isMultiselect && typeof newValue === 'boolean') {
      multiSelectDictionaryIds = {
        ...multiSelectDictionaryIds,
        [id]: newValue,
      };
      dispatch('multiSelect', { ids: multiSelectDictionaryIds });
    } else {
      dictionaryId = newValue ? id : null;
      dispatch('select', { id: dictionaryId });
    }
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>{displayTextPlural}</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if dictionaries.length}
      <SingleActionDataGrid
        bind:this={dictionaryDataGrid}
        {columnDefs}
        {hasDeletePermission}
        itemDisplayText={displayText}
        items={dictionaries}
        {user}
        on:rowClicked={onRowClicked}
        on:cellEditingStopped={onToggle}
        on:deleteItem={deleteDictionaryContext}
      />
    {:else}
      No {displayTextPlural} Found
    {/if}
  </svelte:fragment>
</Panel>
