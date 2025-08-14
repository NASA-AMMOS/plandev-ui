<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import { parcels } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { Parcel } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteParcel?: (parcel: Parcel) => void;
    editParcel?: (parcel: Parcel) => void;
  };
  type ParcelCellRendererParams = ICellRendererParams<Parcel> & CellRendererParams;

  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'text',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    { field: 'name', filter: 'text', headerName: 'Name', resizable: true, sortable: true },
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
  ];

  let filteredParcels: Parcel[] = [];
  let filterText: string = '';
  let selectedParcel: Parcel | null = null;

  $: columnDefs = [
    ...baseColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ParcelCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteParcel,
            deleteTooltip: {
              content: 'Delete Parcel',
              placement: 'bottom',
            },
            editCallback: params.editParcel,
            editTooltip: {
              content: 'Edit Parcel',
              placement: 'bottom',
            },
            hasDeletePermission: params.data ? hasDeletePermission(user, params.data) : false,
            hasEditPermission: params.data ? hasEditPermission(user, params.data) : false,
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteParcel,
        editParcel,
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

  $: filteredParcels = $parcels.filter(parcel => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${parcel.id}`.includes(filterTextLowerCase);
    const includesName = parcel.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });

  async function deleteParcel(parcel: Parcel) {
    const success = await effects.deleteParcel(parcel, user);

    if (success) {
      parcels.filterValueById(parcel.id);

      if (parcel.id === selectedParcel?.id) {
        selectedParcel = null;
      }
    }
  }

  function deleteParcelContext(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as number;
    const parcel = $parcels.find(p => p.id === id);
    if (parcel) {
      deleteParcel(parcel);
    }
  }

  function editParcel({ id }: Pick<Parcel, 'id'>) {
    goto(`${base}/parcels/edit/${id}`);
  }

  function editParcelContext(event: CustomEvent<RowId[]>) {
    editParcel({ id: event.detail[0] as number });
  }

  function hasDeletePermission(user: User | null, parcel: Parcel) {
    return featurePermissions.parcels.canDelete(user, parcel);
  }

  function hasEditPermission(user: User | null, parcel: Parcel) {
    return featurePermissions.parcels.canUpdate(user, parcel);
  }

  async function toggleParcel(event: CustomEvent<DataGridRowSelection<Parcel>>) {
    const { detail } = event;
    const { data: clickedParcel, isSelected } = detail;

    if (isSelected) {
      selectedParcel = clickedParcel;
    }
  }
</script>

<PageTitle title="Parcels" />

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>Parcels</SectionTitle>

    <div class="right">
      <button
        class="st-button secondary ellipsis"
        use:permissionHandler={{
          hasPermission: featurePermissions.parcels.canCreate(user),
          permissionError: 'You do not have permission to create a new parcel',
        }}
        on:click={() => goto(`${base}/parcels/new`)}
      >
        New
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#if filteredParcels.length}
      <SingleActionDataGrid
        {columnDefs}
        hasEdit={true}
        {hasEditPermission}
        {hasDeletePermission}
        itemDisplayText="Parcel"
        items={filteredParcels}
        {user}
        on:deleteItem={deleteParcelContext}
        on:editItem={editParcelContext}
        on:rowSelected={toggleParcel}
      />
    {:else}
      <div class="p1 st-typography-label">No Parcels Found</div>
    {/if}
  </svelte:fragment>
</Panel>
