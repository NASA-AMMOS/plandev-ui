<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { expansionRunsColumns } from '../../stores/expansion';
  import { parcel, parcelId } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection } from '../../types/data-grid';
  import type { ActivityInstanceJoin, ExpandedSequence, ExpansionRun } from '../../types/expansion';
  import { seqJsonToSequence } from '../../utilities/new-sequence-editor/from-seq-json';
  import SequenceEditor from '../sequencing/SequenceEditor.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import ExpandedSequencesDownloadButton from './ExpandedSequencesDownloadButton.svelte';

  export let expansionRuns: ExpansionRun[] = [];
  export let user: User | null;

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
    {
      field: 'simulation_dataset.simulation.plan.name',
      filter: 'text',
      headerName: 'Plan Name',
      resizable: true,
      sortable: true,
    },
    { field: 'expansion_set.name', filter: 'text', headerName: 'Expansion Set', resizable: true, sortable: true },
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
  ];

  const sequenceColumnDefs: DataGridColumnDef[] = [
    {
      field: 'seq_id',
      filter: 'text',
      headerName: 'Sequence ID',
      resizable: true,
      sortable: true,
    },
    {
      autoHeight: true,
      cellRenderer: (params: ICellRendererParams<ExpandedSequence>) => {
        const simulatedActivitiesByType: { [key: string]: number[] } = {};
        const activityInstances: ActivityInstanceJoin[] = params.value;
        activityInstances.reduce((acc, next) => {
          if (!acc[next.simulated_activity.activity_type_name]) {
            acc[next.simulated_activity.activity_type_name] = [next.simulated_activity.id];
          } else {
            acc[next.simulated_activity.activity_type_name].push(next.simulated_activity.id);
          }
          return acc;
        }, simulatedActivitiesByType);

        const cellContentContainer = document.createElement('div');
        Object.keys(simulatedActivitiesByType).forEach((activityType, i) => {
          const simulationDataset = selectedExpansionRun?.simulation_dataset;
          const planId = simulationDataset?.simulation.plan.id;
          const datasetId = simulationDataset?.dataset_id;

          const activitySpan = document.createElement('span');
          const activityIds = simulatedActivitiesByType[activityType].map(activityId => {
            return `<a
              target="_blank"
              href="${base}/plans/${planId}?simulationDatasetId=${datasetId}&activityId=${activityId}">${activityId}</a>`;
          });
          const spacer = i ? ', ' : '';
          activitySpan.innerHTML = spacer + `${activityType} (${activityIds.join(', ')})`;
          cellContentContainer.appendChild(activitySpan);
        });

        return cellContentContainer;
      },
      field: 'sequence.activity_instance_joins',
      headerName: 'Activity Instance(s)',
      resizable: true,
      sortable: false,
      wrapText: true,
    },
  ];

  let selectedSequence: ExpandedSequence | null = null;
  let selectedSequenceIds: number[] = [];
  let selectedExpansionRun: ExpansionRun | null = null;

  $: selectedSequenceIds = selectedSequence ? [selectedSequence.id] : [];

  function toggleRun(event: CustomEvent<DataGridRowSelection<ExpansionRun>>) {
    const {
      detail: { data: clickedRun, isSelected },
    } = event;

    selectedSequence = null;

    if (isSelected) {
      selectedExpansionRun = clickedRun;

      $parcelId = selectedExpansionRun.expansion_set.parcel_id;
    } else if (selectedExpansionRun?.id === clickedRun.id) {
      selectedExpansionRun = null;
      $parcelId = null;
    }
  }

  function toggleSequence(event: CustomEvent<DataGridRowSelection<ExpandedSequence>>) {
    const {
      detail: { data: clickedSequence, isSelected },
    } = event;

    if (isSelected) {
      selectedSequence = clickedSequence;
    } else if (selectedSequence?.id === clickedSequence.id) {
      selectedSequence = null;
    }
  }
</script>

<CssGrid bind:columns={$expansionRunsColumns}>
  <CssGrid rows="1fr 3px 1fr">
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>Expansion Runs</SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if expansionRuns.length}
          <DataGrid {columnDefs} rowSelection="single" rowData={expansionRuns} on:rowSelected={toggleRun} />
        {:else}
          No Expansion Runs Found
        {/if}
      </svelte:fragment>
    </Panel>

    <CssGridGutter track={1} type="row" />

    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>Expanded Sequences</SectionTitle>
        {#if selectedExpansionRun}
          <div class="right">
            <ExpandedSequencesDownloadButton
              expandedSequences={selectedExpansionRun?.expanded_sequences}
              filename={`expanded_sequences_${selectedExpansionRun?.created_at.split('.')[0]}`}
            />
          </div>
        {/if}
      </svelte:fragment>

      <svelte:fragment slot="body">
        {#if selectedExpansionRun}
          <DataGrid
            columnDefs={sequenceColumnDefs}
            rowData={selectedExpansionRun?.expanded_sequences}
            rowSelection="single"
            selectedRowIds={selectedSequenceIds}
            on:rowSelected={toggleSequence}
          />
        {:else}
          No Expansion Run Selected
        {/if}
      </svelte:fragment>
    </Panel>
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    parcel={$parcel}
    sequenceDefinition={seqJsonToSequence(selectedSequence?.expanded_sequence, [], null) ?? 'No Sequence Selected'}
    sequenceName={selectedSequence?.seq_id}
    sequenceSeqJson={selectedSequence ? JSON.stringify(selectedSequence.expanded_sequence, null, 2) : undefined}
    readOnly={true}
    title="Sequence - Definition Editor (Read-only)"
    {user}
  />
</CssGrid>
