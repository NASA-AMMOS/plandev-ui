<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import { plan } from '../../stores/plan';
  import { simulationDatasetLatest, simulationStatus } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowDoubleClick } from '../../types/data-grid';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { showEditorModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { convertDoyToYmd, formatDate } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';
  import { plugins } from '../../stores/plugins';
  import { field } from '../../stores/form';
  import type { FieldStore } from '../../types/form';
  import { required } from '../../utilities/validators';
  import { tooltip } from '../../utilities/tooltip';
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';
  import type { ExpandedTemplate, SequenceActivityFilter, SequenceFilter } from '../../types/sequencing';
  import { expandedTemplates, planSequenceStatus, sequenceFilters, sequencingError } from '../../stores/sequencing';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import { Status } from '../../enums/status';
  import AlertError from '../ui/AlertError.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  type CellRendererParamsFilterActions = {
    deleteSequenceFilter: (sequence: SequenceFilter) => void;
    openSequenceFilter: (sequence: SequenceFilter, user: User) => void;
  };
  type CellRendererParamsExpandedTemplateActions = {
    openExpandedTemplate: (expandedTemplate: ExpandedTemplate) => void;
  };

  type SequenceFilterCellRendererParams = ICellRendererParams<SequenceFilter> & CellRendererParamsFilterActions;
  type ExpandedTemplateCellRendererParams = ICellRendererParams<ExpandedTemplate> & CellRendererParamsExpandedTemplateActions;

  const createPermissionError = 'You do not have permission to create a sequence filter';
  const deletePermissionError = 'You do not have permission to delete sequence filter';
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
      valueGetter: (params: ValueGetterParams<SequenceFilter>) => {
        return JSON.stringify(params?.data?.filter);
      },
    },
  ];
  const baseExpandedTemplateColumnDefs: DataGridColumnDef[] = [
    {

    }
  ];
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let expandedTemplateColumnDefs: DataGridColumnDef[] = baseExpandedTemplateColumnDefs;
  let hasDeletePermission: boolean = false;
  let hasCreatePermission: boolean = false;
  let selectedSequenceFilter: SequenceFilter | null;
  let startTimeField: FieldStore<string>;
  let endTimeField: FieldStore<string>;
  let startTimeFieldDate: Date;
  let endTimeFieldDate: Date;
  let planStartTime: string = formatDate(planStartTimeDate, $plugins.time.primary.format);
  let planEndTime: string = formatDate(planEndTimeDate, $plugins.time.primary.format);
  let seqNameInput: string;
  let filterMenu: ActivityFilterBuilder;
  let filterMenuActiveFilter: SequenceActivityFilter = {};
  let currentModelSequenceFilters: SequenceFilter[] = [];
  let planStartDate: Date | undefined;
  let planEndDate: Date | undefined;
  let dataGrid: DataGrid<SequenceFilter>;
  let expandedTemplateDataGrid: DataGrid<ExpandedTemplate>;
  let selectedSequenceFilterId: number | null = null;
  let selectedSequenceFilterIds: number[] = [];
  let selectedExpandedTemplateId: number | null = null;

  $: console.log($expandedTemplates);

  $: if ($plan !== null) {
    planStartDate = $plugins.time.primary.parse($plan.start_time_doy) ?? undefined;
    planEndDate = $plugins.time.primary.parse($plan.end_time_doy) ?? undefined;
  }

  $: currentModelSequenceFilters = $sequenceFilters.filter(seqFilter => seqFilter.model_id === $plan?.model_id);

  $: startTimeField = field<string>(planStartTime, [required, $plugins.time.primary.validate]);
  $: endTimeField = field<string>(planEndTime, [required, $plugins.time.primary.validate]);

  $: if ($startTimeField.value && $endTimeField.value) {
    startTimeFieldDate = new Date(convertDoyToYmd($startTimeField.value) ?? '');
    endTimeFieldDate = new Date(convertDoyToYmd($endTimeField.value) ?? '');
  }

  $: if (user !== null && $plan !== null) {
    hasDeletePermission = featurePermissions.sequenceFilter.canDelete(user);
    hasCreatePermission = featurePermissions.sequenceFilter.canCreate(user);
  }

  $: selectedSequenceFilter = $sequenceFilters.find(s => s.id === selectedSequenceFilterId) ?? null;

  $: isTemplatingDisabled = selectedSequenceFilterIds.length === 0 || selectedSequenceFilterId === null || $simulationStatus !== Status.Complete;

  $: columnDefs = [
    ...columnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: SequenceFilterCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteSequenceFilter,
            deleteTooltip: {
              content: 'Delete Sequence Filter',
              placement: 'bottom',
            },
            hasDeletePermission,
            rowData: params.data,
            viewCallback: data => user && params.openSequenceFilter(data, user),
            viewTooltip: {
              content: 'Open Sequence Filter',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });
        return actionsDiv;
      },
      cellRendererParams: {
        deleteSequenceFilter,
        openSequenceFilter,
      } as CellRendererParamsFilterActions,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
  ];

  $: expandedTemplateColumnDefs = [
    ...expandedTemplateColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ExpandedTemplateCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            rowData: params.data,
            viewCallback: data => user && params.openExpandedTemplate(data),
            viewTooltip: {
              content: 'Open Expanded Template',
              placement: 'bottom'
            }
          },
          target: actionsDiv
        });
        return actionsDiv;
      },
      cellRendererParams: {
        openExpandedTemplate
      } as CellRendererParamsExpandedTemplateActions,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizetoFit: true,
      width: 55
    }
  ]

  function deleteSequenceFilter(sequenceFilter: SequenceFilter) {
    effects.deleteSequenceFilters([sequenceFilter.id], user);
  }

  function openSequenceFilter(sequenceFilter: SequenceFilter) {
    showEditorModal(sequenceFilter, "json", `Sequence Filter ID: ${sequenceFilter.id}`, true);
  }

  function openExpandedTemplate(expandedTemplate: ExpandedTemplate) {
    showEditorModal(expandedTemplate, "json", `Expanded Template ID : ${expandedTemplate.id}`, true);
  }

  async function onCreateSequenceFilter() {
    // This always *should* be true, but check anyway to keep TS happy
    if ($plan !== null) {
      await effects.createSequenceFilter(filterMenuActiveFilter, seqNameInput, $plan.model_id, user);
      filterMenu.setActiveFilter({}); // Reset filter
      seqNameInput = '';
    }
  }

  function onToggleFilterMenu() {
    filterMenu.toggle();
  }

  function onBulkDeleteItems(event: CustomEvent<SequenceFilter[]>) {
    const { detail: sequenceFiltersToDelete } = event;
    const idsToDelete = sequenceFiltersToDelete.map(sequenceFilter => sequenceFilter.id);
    if (idsToDelete.length > 0) {
      effects.deleteSequenceFilters(idsToDelete, user);
    }
  }

  function onViewSequenceFilter() {
    if (selectedSequenceFilter !== null) {
      showEditorModal(selectedSequenceFilter, "json", `Sequence Filter ID: ${selectedSequenceFilter.id}`, true);
    }
  }

  function onRowDoubleClicked(event: CustomEvent<DataGridRowDoubleClick<SequenceFilter>>) {
    const {
      detail: { data: clickedRow },
    } = event;
    showEditorModal(clickedRow, "json", `Sequence Filter ID: ${clickedRow.id}`, true);
  }

  function onRunTemplating() {
    $sequencingError = null;

    if ($simulationDatasetLatest === null) {
      sequencingError.set("No latest simulation found - please run simulation first before templating!");
      return;
    }

    if (!selectedSequenceFilterIds) {
      sequencingError.set("No selected sequence filter(s) found - please select one from the dropdown before templating!");
      return;
    }

    // This should never happen.. but check to make TS happy
    if (!$plan) {
      sequencingError.set("No plan could be found in this context!");
      return;
    }

    effects.expandTemplates(
      selectedSequenceFilterIds,
      $plan?.model_id,
      $simulationDatasetLatest.id,
      $startTimeField.value,
      $endTimeField.value,
      user
    )
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Sequencing" />
    <PanelHeaderActions status={$planSequenceStatus} indeterminate>
      <PanelHeaderActionButton
        title="Run Templating"
        showLabel
        disabled={isTemplatingDisabled}
        on:click={onRunTemplating}
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
    <AlertError class="m-2" error={$sequencingError} />
    <div class="sequence-panel-body">
      <fieldset>
        <!-- TODO: This might be too much w. bulk actions on the table -->
        <label for="sequenceFilter" class="sequence-filter-selector">
          Sequence Filter
          <!-- TODO: URL, this page doesn't exist.. should we make one for the filters-->
          <a href={`${base}/expansion/sets`} target="_blank" rel="noopener noreferrer">View All Filters</a>
        </label>
        <select
          bind:value={selectedSequenceFilterId}
          class="st-select w-100"
          disabled={!currentModelSequenceFilters.length}
          name="sequenceFilter"
        >
          {#if !currentModelSequenceFilters.length}
            <option value={null}>No Sequence Filters Found</option>
          {:else}
            <option value={null} />
            {#each currentModelSequenceFilters as set}
              <option value={set.id}>
                {set.name} ({set.id})
              </option>
            {/each}
          {/if}
        </select>
      </fieldset>
      <fieldset>
        <Collapse title="Sequence Filter Details" defaultExpanded={false} padContent={false}>
          {#if !selectedSequenceFilter}
            <div class="st-typography-label">No Sequence Filter Selected</div>
          {:else}
            <div class="sequence-filter-details">
              <div class="sequence-filter-detail">
                <span class="st-typography-label">Filter ID: </span>
                <span>{selectedSequenceFilter.id}</span>
              </div>
              <div class="sequence-filter-detail">
                <span class="st-typography-label">Model ID: </span>
                <span>{selectedSequenceFilter.model_id}</span>
              </div>
              <div class="sequence-filter-detail">
                <span class="st-typography-label">Name: </span>
                <span>{selectedSequenceFilter.name}</span>
              </div>
            </div>
            <button class="st-button w-100 secondary" on:click|stopPropagation={onViewSequenceFilter}>
              View Filter Definitions
            </button>
          {/if}
        </Collapse>
      </fieldset>
      <fieldset>
        <Collapse title="Sequencing Time Range" defaultExpanded={false} padContent={false}>
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
        <Collapse className="details-container" title="Sequence Filters" padContent={false}>
          <div class="sequence-filter-form-container">
            <CssGrid class="sequence-filter-form" rows="min-content auto">
              <CssGrid columns="3fr" gap="12px">
                <div class="seq-name">
                  <label for="seqName">Sequence Filter Name</label>
                  <input
                    bind:value={seqNameInput}
                    class="st-input w-100"
                    name="seqName"
                    use:permissionHandler={{
                      hasPermission: hasCreatePermission,
                      permissionError: createPermissionError,
                    }}
                  />
                </div>
                <button
                  class="st-button secondary w-100"
                  on:click|stopPropagation={onToggleFilterMenu}
                  use:permissionHandler={{
                    hasPermission: hasCreatePermission,
                    permissionError: createPermissionError,
                  }}
                >
                  Show Sequence Filter Definition
                </button>
                <button
                  class="st-button active w-100"
                  on:click|stopPropagation={onCreateSequenceFilter}
                  use:tooltip={{
                    content: 'Options for creating a sequence',
                    placement: 'top',
                  }}
                  use:permissionHandler={{
                    hasPermission: hasCreatePermission,
                    permissionError: createPermissionError,
                  }}
                >
                  Create Sequence Filter
                </button>
              </CssGrid>
              <div class="mt-2">
                {#if $sequenceFilters.length}
                  <BulkActionDataGrid
                    bind:dataGrid
                    bind:selectedItemId={selectedSequenceFilterId}
                    bind:selectedItemIds={selectedSequenceFilterIds}
                    getRowId={rowData => rowData.id}
                    {columnDefs}
                    loading={!currentModelSequenceFilters}
                    {hasDeletePermission}
                    hasDeletePermissionError={deletePermissionError}
                    items={currentModelSequenceFilters}
                    pluralItemDisplayText="Sequence Filters"
                    scrollToSelection={true}
                    singleItemDisplayText="Sequence Filter"
                    {user}
                    on:bulkDeleteItems={e => onBulkDeleteItems(e)}
                    on:rowDoubleClicked={e => onRowDoubleClicked(e)}
                  />
                {:else}
                  <div class="st-typography-label">
                    No Sequence Filters for Model '{$plan?.model.name}'
                  </div>
                {/if}
              </div>

            </CssGrid>
          </div>
        </Collapse>
        <Collapse className="details-container" title="Expanded Templates" padContent={false} defaultExpanded={false}>
          <div class="sequence-filter-form-container">
            <CssGrid class="sequence-filter-form" rows="min-content auto">
              <div class="mt-2">
                {#if $expandedTemplates.length && $simulationDatasetLatest !== null}
                  <SingleActionDataGrid
                    bind:dataGrid={expandedTemplateDataGrid}
                    bind:selectedItemId={selectedExpandedTemplateId}
                    getRowId={rowData => rowData.id}
                    columnDefs={expandedTemplateColumnDefs}
                    loading={!$expandedTemplates}
                    itemDisplayText="Expanded Template"
                    items={$expandedTemplates}
                    scrollToSelection={true}
                    {user}
                  />
                {:else}
                  <div class="st-typography-label">
                    No Expanded Templates for Simulation Dataset '{$simulationDatasetLatest?.id}'
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

  .sequence-filter-selector {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .sequence-filter-selector a:visited {
    color: blue;
  }

  .sequence-filter-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sequence-filter-detail {
    display: flex;
  }
  .sequence-filter-details span:first-child {
    display: flex;
    flex: 1;
    max-width: 200px;
  }

  .sequence-filter-details span:last-child {
    display: flex;
    flex: 1;
  }

  :global(.details-container) {
    height: 100%;
  }
  :global(.details-container.collapse .content) {
    height: calc(100%);
  }

  :global(.details-container.collapse .sequence-filter-form-container) {
    height: calc(100% - 48px);
  }

  :global(.sequence-filter-form) {
    height: 100%;
  }
</style>
