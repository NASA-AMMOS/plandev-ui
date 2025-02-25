<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { parcels, userSequences } from '../../stores/sequencing';
  import type { User, UserId } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { UserSequence } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { featurePermissions } from '../../utilities/permissions';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  type CellRendererParams = {
    deleteSequence: (sequence: UserSequence) => void;
    editSequence: (sequence: UserSequence) => void;
  };
  type SequencesCellRendererParams = ICellRendererParams<UserSequence> & CellRendererParams;

  export let filterText: string;
  export let user: User | null;

  let baseColumnDefs: DataGridColumnDef[] = [];
  let columnDefs = baseColumnDefs;
  let filteredSequences: UserSequence[] = [];
  let selectedSequence: UserSequence | null = null;

  const dispatch = createEventDispatcher<{
    sequenceSelected: UserSequence;
  }>();

  $: baseColumnDefs = [
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
    {
      field: 'parcel',
      filter: 'text',
      headerName: 'Parcel',
      resizable: true,
      sortable: true,
      valueGetter: ({ data }) => {
        return $parcels.find(p => data.parcel_id === p.id)?.name;
      },
    },
    {
      comparator: usernameComparator,
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      sort: 'desc',
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
  ];

  $: columnDefs = [
    ...baseColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: SequencesCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteSequence,
            deleteTooltip: {
              content: 'Delete Sequence',
              placement: 'bottom',
            },
            editCallback: params.editSequence,
            editTooltip: {
              content: 'Edit Sequence',
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
        deleteSequence,
        editSequence,
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

  $: filteredSequences = $userSequences.filter(sequence => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${sequence.id}`.includes(filterTextLowerCase);
    const includesName = sequence.name.toLocaleLowerCase().includes(filterTextLowerCase);

    return includesId || includesName;
  });

  async function deleteSequence(sequence: UserSequence) {
    const success = await effects.deleteUserSequence(sequence, user);

    if (success) {
      userSequences.filterValueById(sequence.id);

      if (sequence.id === selectedSequence?.id) {
        selectedSequence = null;
      }
    }
  }

  function deleteSequenceContext(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as number;
    const sequence = $userSequences.find(s => s.id === id);
    if (sequence) {
      deleteSequence(sequence);
    }
  }

  function editSequence({ id }: Pick<UserSequence, 'id'>) {
    // TODO: populate this...
  }

  function editSequenceContext(event: CustomEvent<RowId[]>) {
    editSequence({ id: event.detail[0] as number });
  }

  function hasDeletePermission(user: User | null, sequence: UserSequence) {
    return featurePermissions.sequences.canDelete(user, sequence);
  }

  function hasEditPermission(user: User | null, sequence: UserSequence) {
    return featurePermissions.sequences.canUpdate(user, sequence);
  }

  function onFilterToUsersSequences(event: Event) {
    const { value: enabled } = getTarget(event);

    if (enabled as boolean) {
      filteredSequences = $userSequences.filter(sequence => {
        return sequence.owner === user?.id;
      });
    } else {
      filteredSequences = $userSequences;
    }
  }

  async function toggleSequence(event: CustomEvent<DataGridRowSelection<UserSequence>>) {
    const { detail } = event;
    const { data: clickedSequence, isSelected } = detail;

    if (isSelected) {
      selectedSequence = clickedSequence;
      dispatch('sequenceSelected', selectedSequence);
    }
  }

  /**
   * Sort the sequence table with the current users sequences at the top.
   * @param valueA
   * @param valueB
   */
  function usernameComparator(valueA: UserId, valueB: UserId): number {
    if (valueA === null && valueB === null) {
      return 0;
    }
    if (valueA === null) {
      return -1;
    }
    if (valueB === null) {
      return 1;
    }

    return valueA === user?.id ? 1 : -1;
  }
</script>

<div class="filter-container">
  <div>
    <input type="checkbox" on:change={onFilterToUsersSequences} />
    <span class=" st-typography-body">Filter to my sequences</span>
  </div>
</div>

{#if filteredSequences.length}
  <SingleActionDataGrid
    {columnDefs}
    hasEdit={true}
    {hasEditPermission}
    {hasDeletePermission}
    itemDisplayText="Sequence"
    items={filteredSequences}
    {user}
    on:deleteItem={deleteSequenceContext}
    on:editItem={editSequenceContext}
    on:rowSelected={toggleSequence}
  />
{:else}
  <div class="p1 st-typography-label">No Sequences Found</div>
{/if}

<style>
  .filter-container {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
</style>
