<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { planExpansionStatus } from '../../stores/expansion';
  import { activityTypes, plan, planReadOnly } from '../../stores/plan';
  import { simulationDatasetId, simulationStatus, spans } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { showSequenceDefinitionModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { convertDoyToYmd, formatDate } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import { plugins } from '../../stores/plugins';
  import { field } from '../../stores/form';
  import type { FieldStore } from '../../types/form';
  import { required } from '../../utilities/validators';
  import { tooltip } from '../../utilities/tooltip';
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';
  import type { SequenceDefinition, SequenceFilter } from '../../types/sequencing';
  import { selectedSequenceDefinitionId, sequenceDefinitions } from '../../stores/sequencing';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import { applyActivityLayerFilter } from '../../utilities/timeline';
  import { activityArgumentDefaultsMap, activityDirectivesMap } from '../../stores/activities';
  import type { ActivityDirective } from '../../types/activity';
  import type { Span } from '../../types/simulation';
  import { Status } from '../../enums/status';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  type CellRendererParams = {
    deleteSequenceDefinition: (sequence: SequenceDefinition) => void;
    openSequenceDefinition: (sequence: SequenceDefinition, user: User) => void;
  };
  type SequenceDefinitionCellRendererParams = ICellRendererParams<SequenceDefinition> & CellRendererParams;

  const createPermissionError = 'You do not have permission to create a sequence definition';
  const planStartTimeDate: Date = new Date($plan?.start_time ?? '');
  const planEndTimeDate: Date = new Date(convertDoyToYmd($plan?.end_time_doy ?? '') ?? '');
  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressSizeToFit: true,
      width: 55,
    },
    {
      field: 'name',
      filter: 'text',
      headerName: 'Seq Name',
      resizable: true,
      sortable: true,
      width: 100,
    },
    {
      field: 'filter',
      filter: 'text',
      headerName: 'Filter',
      hide: true,
      resizable: true,
      sortable: false,
      valueGetter: (params: ValueGetterParams<SequenceDefinition>) => {
        return JSON.stringify(params?.data?.filter);
      },
    },
  ];

  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let hasDeletePermission: boolean = false;
  let hasCreatePermission: boolean = false;
  let selectedSequenceDefinition: SequenceDefinition | null;
  let startTimeField: FieldStore<string>;
  let endTimeField: FieldStore<string>;
  let planStartTime: string = formatDate(planStartTimeDate, $plugins.time.primary.format);
  let planEndTime: string = formatDate(planEndTimeDate, $plugins.time.primary.format);
  let seqNameInput: string;
  let filterMenu: ActivityFilterBuilder;
  let filterMenuActiveFilter: SequenceFilter = {};
  let currentModelSequenceDefinitions: SequenceDefinition[] = []; // TODO: This could just be a derived store
  let selectedSequenceDefinitionActivities: { directives: ActivityDirective[], spans: Span[] } = { directives: [], spans: [] };
  let planStartDate: Date | undefined;
  let planEndDate: Date | undefined;

  $: if ($plan !== null) {
    planStartDate = $plugins.time.primary.parse($plan.start_time_doy) ?? undefined;
    planEndDate = $plugins.time.primary.parse($plan.end_time_doy) ?? undefined;
  }

  $: currentModelSequenceDefinitions = $sequenceDefinitions.filter(seqDef => seqDef.model_id === $plan?.model_id);

  $: startTimeField = field<string>(planStartTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(planEndTime, [required, $plugins.time.primary.validate]);

  $: if (user !== null && $plan !== null) {
    hasDeletePermission = featurePermissions.sequenceDefinition.canDelete(user);
    hasCreatePermission = featurePermissions.sequenceDefinition.canCreate(user);
  }

  $: selectedSequenceDefinition = $sequenceDefinitions.find(s => s.id === $selectedSequenceDefinitionId) ?? null;

  $: columnDefs = [
    ...columnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: SequenceDefinitionCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteSequenceDefinition,
            deleteTooltip: {
              content: 'Delete Sequence Definition',
              placement: 'bottom',
            },
            hasDeletePermission,
            rowData: params.data,
            viewCallback: data => user && params.openSequenceDefinition(data, user),
            viewTooltip: {
              content: 'Open Sequence Definition',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteSequenceDefinition,
        openSequenceDefinition,
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

  $: activityDirectives = Object.values($activityDirectivesMap || {});
  $: if (selectedSequenceDefinition && $spans) {
    selectedSequenceDefinitionActivities = applyActivityLayerFilter(
      selectedSequenceDefinition.filter,
      activityDirectives,
      $spans || [],
      $activityTypes,
      $activityArgumentDefaultsMap,
    )
  }

  function deleteSequenceDefinition(sequenceDefinition: SequenceDefinition) {
    effects.deleteSequenceDefinition(sequenceDefinition.id, user);
  }

  function openSequenceDefinition(sequenceDefinition: SequenceDefinition) {
    showSequenceDefinitionModal(sequenceDefinition);
  }

  async function onCreateSequenceDefinition() {
    // This always *should* be true, but check anyway to keep TS happy
    if ($plan !== null) {
      await effects.createSequenceDefinition(filterMenuActiveFilter, seqNameInput, $plan.model_id, user);
    }
  }

  function onToggleFilterMenu() {
    filterMenu.toggle();
  }

  function onDeleteSequenceDefinition(event: CustomEvent<RowId[]>) {
    const idToDelete = event.detail.pop();
    if (idToDelete !== undefined) {
      // Row ID is always a number for this table
      effects.deleteSequenceDefinition(idToDelete as number, user);
    }
  }

  function onViewSequenceDefinitionFilter() {
    if (selectedSequenceDefinition !== null) {
      showSequenceDefinitionModal(selectedSequenceDefinition);
    }
  }

  function onRowSelected(event: CustomEvent<DataGridRowSelection<SequenceDefinition>>) {
    const {
      detail: {
        data: { id: newSelectionId },
      },
    } = event;
    $selectedSequenceDefinitionId = newSelectionId;
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Sequencing" />
    <!-- TODO Convert from expansion -->
    <PanelHeaderActions status={$planExpansionStatus} indeterminate>
      <PanelHeaderActionButton
        title="Run Templating"
        showLabel
        disabled={$selectedSequenceDefinitionId === null}
        on:click={() => {
          if ($selectedSequenceDefinitionId && $plan) {
            effects.expand($selectedSequenceDefinitionId, $simulationDatasetId, $plan, $plan.model, user);
          }
        }}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <ActivityFilterBuilder
      layerName={seqNameInput}
      bind:this={filterMenu}
      on:rename={newName => {
        seqNameInput = newName.detail.name;
      }}
      on:filterChange={filter => {
        filterMenuActiveFilter = filter.detail.filter;
      }}
    />
    <div class="sequence-panel-body">
      <fieldset>
        <label for="sequenceDefinition" class="sequence-definition-selector">
          Sequence Definition
          <!-- TODO: URL, this page doesn't exist.. should we make one for the definitions-->
          <a href={`${base}/expansion/sets`} target="_blank" rel="noopener noreferrer">View All Definitions</a>
        </label>
        <select
          bind:value={$selectedSequenceDefinitionId}
          class="st-select w-100"
          disabled={!currentModelSequenceDefinitions.length}
          name="sequenceDefinition"
        >
          {#if !currentModelSequenceDefinitions.length}
            <option value={null}>No Sequence Definitions Found</option>
          {:else}
            <option value={null} />
            {#each currentModelSequenceDefinitions as set}
              <option value={set.id}>
                {set.name} ({set.id})
              </option>
            {/each}
          {/if}
        </select>
      </fieldset>
      <fieldset>
        <Collapse
          className="details-container"
          title="Sequence Definition Details"
          defaultExpanded={false}
          padContent={false}
        >
          {#if !selectedSequenceDefinition}
            <div class="st-typography-label">No Sequence Definition Selected</div>
          {:else}
            <div class="sequence-definition-details">
              <div class="sequence-definition-detail">
                <span class="st-typography-label">Definition ID: </span>
                <span>{selectedSequenceDefinition.id}</span>
              </div>
              <div class="sequence-definition-detail">
                <span class="st-typography-label">Model ID: </span>
                <span>{selectedSequenceDefinition.model_id}</span>
              </div>
              <div class="sequence-definition-detail">
                <span class="st-typography-label">Name: </span>
                <span>{selectedSequenceDefinition.name}</span>
              </div>
              <div class="sequence-definition-detail">
                <span class="st-typography-label">Activities in Filter: </span>
                <span>
                  {selectedSequenceDefinitionActivities.spans.length}
                  {#if $simulationStatus !== Status.Complete}
                    <div class="simulation-warning" use:tooltip={{ content: 'Simulation out-of-date', placement: 'top' }}>
                      <WarningIcon class="yellow-icon"/>
                    </div>
                  {/if}
                </span>
              </div>
            </div>
            <button class="st-button w-100 secondary" on:click|stopPropagation={onViewSequenceDefinitionFilter}>
              View Filters
            </button>
          {/if}
        </Collapse>
      </fieldset>
      <fieldset>
        <Collapse className="time-container" title="Sequencing Time Range" defaultExpanded={false} padContent={false}>
          <DatePickerField
            name="start-time"
            label={`Start Time - ${$plugins.time.primary.formatString}`}
            minDate={planStartDate}
            maxDate={planEndDate}
            field={startTimeField}
          ></DatePickerField>
          <DatePickerField
            name="end-time"
            label={`End Time - ${$plugins.time.primary.formatString}`}
            minDate={planStartDate}
            maxDate={planEndDate}
            field={endTimeField}
          ></DatePickerField>
        </Collapse>
      </fieldset>
      <fieldset>
        <Collapse className="details-container" title="Sequence Definitions" padContent={false}>
          <div class="sequence-definition-form-container">
            <CssGrid class="sequence-definition-form" rows="min-content auto">
              <CssGrid columns="3fr" gap="10px">
                <div class="seq-name">
                  <label for="seqName">Sequence Definition Name</label>
                  <input
                    bind:value={seqNameInput}
                    class="st-input w-100"
                    name="seqName"
                    use:permissionHandler={{
                      hasPermission: true,
                      permissionError: $planReadOnly
                        ? PlanStatusMessages.READ_ONLY
                        : 'You do not have permission to create an expansion',
                    }}
                  />
                </div>
                <button
                  class="st-button secondary w-100"
                  use:permissionHandler={{
                    hasPermission: true,
                    permissionError: $planReadOnly
                      ? PlanStatusMessages.READ_ONLY
                      : 'You do not have permission to create an expansion.',
                  }}
                  on:click|stopPropagation={onToggleFilterMenu}
                >
                  Show Sequence Definition Filter
                </button>
                <button
                  class="st-button active w-100"
                  on:click|stopPropagation={onCreateSequenceDefinition}
                  use:tooltip={{
                    content: 'Options for creating a sequence',
                    placement: 'top',
                  }}
                  use:permissionHandler={{
                    hasPermission: hasCreatePermission,
                    permissionError: createPermissionError,
                  }}
                >
                  Create Sequence Definition
                </button>
              </CssGrid>
              <div class="mt-2">
                {#if $sequenceDefinitions.length}
                  <SingleActionDataGrid
                    getRowId={rowData => rowData.id}
                    {columnDefs}
                    {hasDeletePermission}
                    itemDisplayText="Sequence Definition"
                    items={currentModelSequenceDefinitions}
                    {user}
                    on:rowSelected={e => onRowSelected(e)}
                    on:deleteItem={e => onDeleteSequenceDefinition(e)}
                  />
                {:else}
                  <div class="st-typography-label">
                    No Sequence Definitions for Model '{$plan?.model.name}'
                  </div>
                {/if}
              </div>
            </CssGrid>
          </div>
        </Collapse>
      </fieldset>
    </div>
  </svelte:fragment>
</Panel>

<style>
  .sequence-panel-body {
    display: grid;
    grid-template-rows: min-content min-content min-content auto;
    gap: 16px;
    height: 100%;
  }

  .sequence-definition-selector {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .sequence-definition-selector a:visited {
    color: blue;
  }

  .sequence-definition-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sequence-definition-detail {
    display: flex;
  }
  .sequence-definition-details span:first-child {
    display: flex;
    flex: 1;
    max-width: 200px;
  }

  .sequence-definition-details span:last-child {
    display: flex;
    flex: 1;
  }

  .simulation-warning {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    padding-left: 4px;
  }

  :global(.details-container) {
    height: 100%;
  }
  :global(.details-container.collapse .content) {
    height: calc(100%);
  }

  :global(.details-container.collapse .sequence-definition-form-container) {
    height: calc(100% - 48px);
  }

  :global(.sequence-definition-form) {
    height: 100%;
  }
</style>
