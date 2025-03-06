<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import { plan, planReadOnly } from '../../stores/plan';
  import { expandedTemplates, sequenceTemplateExpansionError } from '../../stores/sequence-template';
  import { parcels, selectedParcel, selectedSequence } from '../../stores/sequencing';
  import { simulationDatasetLatest } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExpandedTemplate } from '../../types/sequence-template';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { showEditorModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import GridMenu from '../menus/GridMenu.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  type CellRendererParamsActions = {
    openExpandedTemplate: (expandedTemplate: ExpandedTemplate) => void;
  };
  type CellRendererParams = ICellRendererParams<ExpandedTemplate> & CellRendererParamsActions;

  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'seq_id',
      filter: 'string',
      headerName: 'Sequence ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'simulation_dataset_id',
      filter: 'number',
      headerName: 'Simulation Dataset ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'created_at',
      filter: 'string',
      headerName: 'Created At',
      resizable: true,
      sortable: true,
    },
  ];

  const templatePermissionError: string = 'You do not have permission to expand sequence templates';

  let hasTemplatePermission: boolean = false;

  let expandedTemplateDataGrid: DataGrid<ExpandedTemplate>;
  let selectedExpandedTemplateId: number | null = null;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;

  $: columnDefs = [
    ...columnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: CellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            rowData: params.data,
            viewCallback: data => user && params.openExpandedTemplate(data),
            viewTooltip: {
              content: 'Open Expanded Template',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });
        return actionsDiv;
      },
      cellRendererParams: {
        openExpandedTemplate,
      } as CellRendererParamsActions,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 20,
    },
  ];

  $: if (user !== null && $plan !== null) {
    hasTemplatePermission = featurePermissions.sequenceTemplate.canTemplate(user, $plan, $plan.model);
  }

  function openExpandedTemplate(expandedTemplate: ExpandedTemplate) {
    // TODO: Proper language setting here (ExpandedTemplate does not know the language!) and EOL setting
    showEditorModal(
      expandedTemplate.expanded_template,
      'plaintext',
      `Expanded Template ID : ${expandedTemplate.id}`,
      true,
    );
  }

  function handleTemplating() {
    if ($selectedSequence !== null && $selectedParcel !== null && $plan !== null && $simulationDatasetLatest !== null) {
      // TODO: Support sending multiple sequences
      effects.expandTemplates(
        [$selectedSequence],
        $simulationDatasetLatest.dataset_id,
        $plan.model_id,
        $selectedParcel,
        user,
      );
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Sequence Templates" />
    <PanelHeaderActions indeterminate>
      <PanelHeaderActionButton
        title="Template"
        showLabel
        disabled={!selectedSequence || !selectedParcel}
        use={[
          [
            permissionHandler,
            {
              hasPermission: hasTemplatePermission,
              permissionError: $planReadOnly ? PlanStatusMessages.READ_ONLY : templatePermissionError,
            },
          ],
        ]}
        on:click={() => {
          if (
            selectedSequence !== null &&
            selectedParcel !== null &&
            $plan !== null &&
            $simulationDatasetLatest !== null
          ) {
            handleTemplating();
          }
        }}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <AlertError class="m-2" error={$sequenceTemplateExpansionError} />
    <fieldset>
      <label for="sequence" class="sequence-selector">Sequence</label>
      <select
        bind:value={$selectedSequence}
        class="st-select w-100"
        disabled={!$filteredExpansionSequences}
        name="sequence"
      >
        <option value={null} />
        {#each $filteredExpansionSequences as sequence}
          <option value={sequence.seq_id}>
            {sequence.seq_id}
          </option>
        {/each}
      </select>
    </fieldset>
    <fieldset>
      <label for="parcel" class="parcel-selector"> Parcel </label>
      <select bind:value={$selectedParcel} class="st-select w-100" disabled={!$parcels} name="parcels">
        <option value={null} />
        {#each $parcels as parcel}
          <option value={parcel.id}>
            {parcel.name} ({parcel.id})
          </option>
        {/each}
      </select>
    </fieldset>
    <div class="expanded-templates-table">
      <span class="st-typography-label">Expanded Sequences</span>
      <SingleActionDataGrid
        bind:dataGrid={expandedTemplateDataGrid}
        bind:selectedItemId={selectedExpandedTemplateId}
        getRowId={rowData => rowData.id}
        {columnDefs}
        itemDisplayText="Expanded Template"
        items={$expandedTemplates}
        scrollToSelection={true}
        {user}
      />
    </div>
  </svelte:fragment>
</Panel>

<style>
  .expanded-templates-table {
    height: 70%;
    margin: 16px;
  }
</style>
