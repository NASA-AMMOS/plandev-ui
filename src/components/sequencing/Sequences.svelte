<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { userSequences, userSequencesColumns } from '../../stores/sequencing';
  import effects from '../../utilities/effects';
  import { compare } from '../../utilities/generic';
  import Input from '../form/Input.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import SequenceEditor from './SequenceEditor.svelte';

  type CellRendererParams = {
    deleteSequence: (sequence: UserSequence) => void;
    editSequence: (sequence: UserSequence) => void;
  };
  type SequencesCellRendererParams = ICellRendererParams<UserSequence> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 100,
    },
    { field: 'name', headerName: 'Name', resizable: true, sortable: true },
    { field: 'authoring_command_dict_id', headerName: 'Command Dictionary ID', resizable: true, sortable: true },
    { field: 'created_at', headerName: 'Created At', resizable: true, sortable: true },
    { field: 'updated_at', headerName: 'Created At', resizable: true, sortable: true },
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

  let abortController: AbortController;
  let filterText: string = '';
  let filteredSequences: UserSequence[] = [];
  let selectedSequence: UserSequence | null = null;
  let selectedSequenceSeqJson: string = 'No Sequence Selected';
  let sortedSequences: UserSequence[] = [];

  $: filteredSequences = $userSequences.filter(sequence => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesId = `${sequence.id}`.includes(filterTextLowerCase);
    const includesName = sequence.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesId || includesName;
  });
  $: sortedSequences = filteredSequences.sort((a, b) => compare(a.id, b.id));
  $: if (selectedSequence !== null) {
    const found = $userSequences.findIndex(sequence => sequence.id === selectedSequence.id);
    if (found === -1) {
      selectedSequence = null;
    }
  }

  async function deleteSequence({ id }: UserSequence) {
    const success = await effects.deleteUserSequence(id);

    if (success) {
      sortedSequences = sortedSequences.filter(sequence => sequence.id !== id);

      if (id === selectedSequence?.id) {
        selectedSequence = null;
        selectedSequenceSeqJson = 'No Sequence Selected';
      }
    }
  }

  async function getUserSequenceSeqJson(): Promise<void> {
    if (selectedSequence !== null) {
      abortController?.abort();
      abortController = new AbortController();
      selectedSequenceSeqJson = 'Generating Seq JSON...';

      const responseMessage = await effects.getUserSequenceSeqJson(
        selectedSequence.authoring_command_dict_id,
        selectedSequence.definition,
        abortController.signal,
      );

      if (selectedSequence === null) {
        selectedSequenceSeqJson = 'No Sequence Selected';
      } else if (responseMessage === 'The user aborted a request.') {
        selectedSequenceSeqJson = 'Generating Seq JSON...';
      } else {
        selectedSequenceSeqJson = responseMessage;
      }
    }
  }

  function editSequence({ id }: UserSequence) {
    goto(`${base}/sequencing/edit/${id}`);
  }

  async function toggleSequence(event: CustomEvent<DataGridRowSelection<UserSequence>>) {
    const { detail } = event;
    const { data: clickedSequence, isSelected } = detail;

    if (isSelected) {
      selectedSequence = clickedSequence;
      await getUserSequenceSeqJson();
    }
  }
</script>

<CssGrid bind:columns={$userSequencesColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <Chip>Sequences</Chip>

      <Input>
        <input
          bind:value={filterText}
          class="st-input"
          placeholder="Filter sequences"
          style="max-width: 300px; width: 100%;"
        />
      </Input>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/sequencing/new`)}> New </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if sortedSequences.length}
        <DataGrid {columnDefs} rowData={sortedSequences} rowSelection="single" on:rowSelected={toggleSequence} />
      {:else}
        <div class="p1 st-typography-label">No Sequences Found</div>
      {/if}
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    sequenceDefinition={selectedSequence?.definition ?? 'No Sequence Selected'}
    sequenceCommandDictionaryId={selectedSequence?.authoring_command_dict_id}
    sequenceName={selectedSequence?.name}
    sequenceSeqJson={selectedSequenceSeqJson}
    readOnly={true}
    title="Sequence - Definition Editor (Read-only)"
    on:generate={getUserSequenceSeqJson}
  />
</CssGrid>
