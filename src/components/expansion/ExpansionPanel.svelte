<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { ICellRendererParams } from 'ag-grid-community';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import {
    creatingExpansionSequence,
    expansionSets,
    filteredExpansionSequences,
    planExpansionStatus,
    selectedExpansionSetId,
  } from '../../stores/expansion';
  import { plan, planReadOnly } from '../../stores/plan';
  import { simulationDatasetId } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, RowId } from '../../types/data-grid';
  import type { ExpansionSequence, ExpansionSet } from '../../types/expansion';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { showExpansionSequenceModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  type CellRendererParams = {
    deleteExpansionSequence: (sequence: ExpansionSequence) => void;
    openExpansionSequence: (sequence: ExpansionSequence, user: User) => void;
  };
  type ExpansionSequenceCellRendererParams = ICellRendererParams<ExpansionSequence> & CellRendererParams;

  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'seq_id',
      filter: 'text',
      headerName: 'Seq ID',
      resizable: true,
      sortable: true,
      suppressSizeToFit: true,
      width: 85,
    },
    {
      field: 'simulation_dataset_id',
      filter: 'number',
      headerName: 'Simulation ID',
      resizable: true,
      sortable: true,
    },
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
  ];

  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let createButtonEnabled: boolean = false;
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasExpandPermission: boolean = false;
  let seqIdInput: string = '';
  let selectedExpansionSet: ExpansionSet | null;

  $: if (user !== null && $plan !== null) {
    hasCreatePermission = featurePermissions.expansionSequences.canCreate(user) && !$planReadOnly;
    hasDeletePermission = featurePermissions.expansionSequences.canDelete(user, $plan) && !$planReadOnly;
    hasExpandPermission = featurePermissions.expansionSequences.canExpand(user, $plan, $plan.model) && !$planReadOnly;
  }
  $: {
    columnDefs = [
      ...baseColumnDefs,
      {
        cellClass: 'action-cell-container',
        cellRenderer: (params: ExpansionSequenceCellRendererParams) => {
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions-cell';
          new DataGridActions({
            props: {
              deleteCallback: params.deleteExpansionSequence,
              deleteTooltip: {
                content: 'Delete Sequence',
                placement: 'bottom',
              },
              hasDeletePermission,
              rowData: params.data,
              viewCallback: data => user && params.openExpansionSequence(data, user),
              viewTooltip: {
                content: 'Open Sequence',
                placement: 'bottom',
              },
            },
            target: actionsDiv,
          });

          return actionsDiv;
        },
        cellRendererParams: {
          deleteExpansionSequence,
          openExpansionSequence: showExpansionSequenceModal,
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
  $: createButtonEnabled = seqIdInput !== '';
  $: selectedExpansionSet = $expansionSets.find(s => s.id === $selectedExpansionSetId) ?? null;

  function deleteExpansionSequence(sequence: ExpansionSequence) {
    effects.deleteExpansionSequence(sequence, user);
  }

  function deleteExpansionSequenceContext(event: CustomEvent<RowId[]>) {
    const selectedSequenceId = event.detail[0];

    const sequenceToDelete = $filteredExpansionSequences.find((sequence: ExpansionSequence) => {
      return sequence.seq_id === selectedSequenceId;
    });

    if (sequenceToDelete) {
      deleteExpansionSequence(sequenceToDelete);
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Expansion" />
    <PanelHeaderActions status={$planExpansionStatus} indeterminate>
      <PanelHeaderActionButton
        title="Expand"
        showLabel
        disabled={$selectedExpansionSetId === null}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasExpandPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to expand sequences',
            },
          ],
        ]}
        on:click={() => {
          if ($selectedExpansionSetId && $plan) {
            effects.expand($selectedExpansionSetId, $simulationDatasetId, $plan, $plan.model, user);
          }
        }}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="expansion-panel-body">
      <fieldset>
        <label for="expansionSet" class="expansion-set-selector">
          Expansion Set
          <a href={`${base}/expansion/sets`} target="_blank" rel="noopener noreferrer">View All Expansion Sets</a>
        </label>
        <select
          bind:value={$selectedExpansionSetId}
          class="st-select w-100"
          disabled={!$expansionSets.length}
          name="expansionSet"
        >
          {#if !$expansionSets.length}
            <option value={null}>No Expansion Sets Found</option>
          {:else}
            <option value={null} />
            {#each $expansionSets as set}
              <option value={set.id}>
                {set.name} ({set.id})
              </option>
            {/each}
          {/if}
        </select>
      </fieldset>
      <fieldset>
        <Collapse className="details-container" title="Expansion Set Details" defaultExpanded={false}>
          {#if !selectedExpansionSet}
            <div class="st-typography-label">No Expansion Set Selected</div>
          {:else}
            <div class="expansion-set-details">
              <div class="expansion-set-detail">
                <span class="st-typography-label">Mission Modal ID:</span>
                <span>{selectedExpansionSet.mission_model_id}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Command Dictionary ID:</span>
                <span>{selectedExpansionSet.command_dict_id}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Name:</span>
                <span>{selectedExpansionSet.name}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Created At:</span>
                <span>{getShortISOForDate(new Date(selectedExpansionSet.created_at))}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Owner:</span>
                <span>{selectedExpansionSet.owner}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Updated At:</span>
                <span>{getShortISOForDate(new Date(selectedExpansionSet.updated_at))}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Updated By:</span>
                <span>{selectedExpansionSet.updated_by}</span>
              </div>
              <div class="expansion-set-detail">
                <span class="st-typography-label">Description:</span>
                <span>{selectedExpansionSet.description}</span>
              </div>
            </div>
          {/if}
        </Collapse>
      </fieldset>

      <fieldset>
        <Collapse className="details-container" title="Sequences">
          <Input>
            <label for="simulationDatasetId">Simulation Dataset ID</label>
            <input class="st-input w-100" disabled name="simulationDatasetId" value={$simulationDatasetId ?? 'None'} />
          </Input>

          {#if $simulationDatasetId === null}
            <div class="pb-3">First run a simulation before creating a sequence</div>
          {:else}
            <div class="expansion-form-container">
              <CssGrid class="expansion-form" rows="min-content auto">
                <CssGrid columns="3fr 1fr" gap="10px">
                  <input
                    bind:value={seqIdInput}
                    class="st-input"
                    use:permissionHandler={{
                      hasPermission: hasCreatePermission,
                      permissionError: $planReadOnly
                        ? PlanStatusMessages.READ_ONLY
                        : 'You do not have permission to create an expansion',
                    }}
                  />
                  <button
                    class="st-button secondary"
                    disabled={!createButtonEnabled}
                    use:permissionHandler={{
                      hasPermission: hasCreatePermission,
                      permissionError: $planReadOnly
                        ? PlanStatusMessages.READ_ONLY
                        : 'You do not have permission to create an expansion',
                    }}
                    on:click|stopPropagation={() =>
                      effects.createExpansionSequence(seqIdInput, $simulationDatasetId, user)}
                  >
                    {$creatingExpansionSequence ? 'Creating... ' : 'Create'}
                  </button>
                </CssGrid>
                <div class="mt-2">
                  {#if $filteredExpansionSequences.length}
                    <SingleActionDataGrid
                      getRowId={rowData => rowData.seq_id}
                      {columnDefs}
                      {hasDeletePermission}
                      itemDisplayText="Sequence"
                      items={$filteredExpansionSequences}
                      {user}
                      on:deleteItem={deleteExpansionSequenceContext}
                      on:rowDoubleClicked={event => showExpansionSequenceModal(event.detail, user)}
                    />
                  {:else}
                    <div class="st-typography-label">
                      No Sequences for Simulation Dataset {$simulationDatasetId ?? ''}
                    </div>
                  {/if}
                </div>
              </CssGrid>
            </div>
          {/if}
        </Collapse>
      </fieldset>
    </div>
  </svelte:fragment>
</Panel>

<style>
  .expansion-panel-body {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
  }

  .expansion-set-selector {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .expansion-set-selector a:visited {
    color: blue;
  }

  .expansion-set-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .expansion-set-detail {
    display: flex;
  }
  .expansion-set-details span:first-child {
    display: flex;
    flex: 1;
    max-width: 200px;
  }

  .expansion-set-details span:last-child {
    display: flex;
    flex: 1;
  }

  :global(.details-container) {
    height: 100%;
  }
  :global(.details-container.collapse .content) {
    height: calc(100%);
  }

  :global(.details-container.collapse .expansion-form-container) {
    height: calc(100% - 48px);
  }

  :global(.expansion-form) {
    height: 100%;
  }
</style>
