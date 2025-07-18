<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import ExternalEventIcon from '../../assets/external-event-box-with-arrow.svg?component';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import {
    createDerivationGroupError,
    createExternalSourceError,
    creatingExternalSource,
    externalSources,
    externalSourceTypes,
    planDerivationGroupLinks,
  } from '../../stores/external-source';
  import { field } from '../../stores/form';
  import { plans } from '../../stores/plans';
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExternalEvent, ExternalEventId, ExternalEventType } from '../../types/external-event';
  import {
    type ExternalSourceSlim,
    type ExternalSourceType,
    type PlanDerivationGroup,
  } from '../../types/external-source';
  import type { ArgumentsMap, ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import effects from '../../utilities/effects';
  import {
    getExternalEventRowId,
    getExternalSourceRowId,
    getExternalSourceSlimRowId,
  } from '../../utilities/externalEvents';
  import {
    getFormParameters,
    translateJsonSchemaArgumentsToValueSchema,
    translateJsonSchemaToValueSchema,
  } from '../../utilities/parameters';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { formatDate, switchISOTimezoneRepresentation } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import ExternalEventForm from '../external-events/ExternalEventForm.svelte';
  import ExternalEventsTable from '../external-events/ExternalEventsTable.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import DatePicker from '../ui/DatePicker/DatePicker.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;

  type CellRendererParams = {
    onDeleteExternalSource: (source: ExternalSourceSlim[]) => void;
  };
  type SourceCellRendererParams = ICellRendererParams<ExternalSourceSlim> & CellRendererParams;

  // Permissions
  const deletePermissionError = 'You do not have permission to delete an external source.';
  const createPermissionError = 'You do not have permission to create an external source.';

  // UI Grid Sizes
  const gridRowSizesNoBottomPanel = '1fr 3px 0fr';
  const gridRowSizesBottomPanel = '1fr 3px 1fr';
  const uiColumnSize = '1.2fr 3px 4fr';
  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'key',
      filter: 'text',
      headerName: 'Key',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.key) {
          return params.data.key;
        }
      },
    },
    {
      field: 'source_type_name',
      filter: 'text',
      headerName: 'Source Type',
      resizable: true,
      sort: 'desc',
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.source_type_name) {
          return params.data.source_type_name;
        }
      },
    },
    {
      field: 'derivation_group',
      filter: 'text',
      headerName: 'Derivation Group',
      resizable: true,
      sort: 'desc',
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.derivation_group_name) {
          return params.data.derivation_group_name;
        }
      },
    },
  ];

  let dataGrid: DataGrid<ExternalSourceSlim> | undefined = undefined;
  let derivationGroupField = field<string>('', [required]);

  // table variables
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;

  // for external events table
  let externalEventsTableFilterString: string = '';

  // source detail variables
  let selectedSource: ExternalSourceSlim | null = null;
  let selectedSourceAttributes: ArgumentsMap = {};
  let selectedSourceType: ExternalSourceType | undefined = undefined;
  let selectedSourceTypeParametersMap: ParametersMap = {};
  let selectedSourceId: string | null = null;
  let selectedSourceEventTypes: ExternalEventType[] = [];

  // Selected element variables
  let selectedEvent: ExternalEvent | null = null;
  let selectedRowId: ExternalEventId | null = null;
  let selectedEvents: ExternalEvent[] = [];

  // We want to parse a file selected for upload.
  let files: FileList | undefined;
  let file: File | undefined;
  let externalSourceFileInput: HTMLInputElement;
  let isUploadDisabled: boolean = true;

  // For filtering purposes (modelled after TimelineEditorLayerFilter):
  let filterExpression: string = '';

  // External source + derivation group creation variables
  let selectedSourceLinkedDerivationGroupsPlans: PlanDerivationGroup[] = [];

  // Permissions
  let hasDeleteExternalSourcePermissionOnSelectedSource: boolean = false;
  let hasCreatePermission: boolean = false;

  let gridRowSizes: string = '1fr 3px 0fr';

  // Clear all error stores when a source is selected as they will not be shown
  $: if (selectedSource !== null) {
    createExternalSourceError.set(null);
    createDerivationGroupError.set(null);
  }

  $: if (selectedSource !== null) {
    hasDeleteExternalSourcePermissionOnSelectedSource = featurePermissions.externalSource.canDelete(user, [
      selectedSource,
    ]);
  }

  $: if (selectedSource !== null && Object.keys(selectedSource.attributes).length > 0) {
    // Create an ArgumentsMap for the External Source
    selectedSourceAttributes = translateJsonSchemaArgumentsToValueSchema(selectedSource.attributes);
    // Create a ParametersMap for the External Source Type
    selectedSourceType = $externalSourceTypes.find(sourceType => sourceType.name === selectedSource?.source_type_name);
    const selectedSourceTypeAttributesTranslated = translateJsonSchemaToValueSchema(
      selectedSourceType?.attribute_schema,
    );
    selectedSourceTypeParametersMap = Object.entries(selectedSourceTypeAttributesTranslated).reduce(
      (acc: ParametersMap, currentAttribute: [string, ValueSchema], index: number) => {
        acc[currentAttribute[0]] = {
          order: index,
          schema: currentAttribute[1],
        };
        return acc;
      },
      {} as ParametersMap,
    );
  }

  $: selectedSourceId = selectedSource
    ? getExternalSourceRowId({ derivation_group_name: selectedSource.derivation_group_name, key: selectedSource.key })
    : null;

  // File parse logic
  $: if (files) {
    // Safeguard against infinitely executing parse logic
    if (file !== files[0]) {
      createExternalSourceError.set(null);
      createDerivationGroupError.set(null);

      file = files[0];
      if (file === undefined || !/\.json$/.test(file.name)) {
        createExternalSourceError.set('External Source file is not a .json file');
        file = undefined;
      }
    }
  }

  // Column definition
  $: columnDefs = [
    ...baseColumnDefs,

    {
      field: 'valid_at',
      filter: 'text',
      headerName: `Valid At (${$plugins.time.primary.label})`,
      resizable: true,
      sort: 'desc',
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.valid_at) {
          return formatDate(new Date(params.data?.valid_at), $plugins.time.primary.format);
        }
      },
    },
    {
      field: 'start_time',
      filter: 'text',
      headerName: `Start Time (${$plugins.time.primary.label})`,
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.start_time) {
          return formatDate(new Date(params.data?.start_time), $plugins.time.primary.format);
        }
      },
    },
    {
      field: 'end_time',
      filter: 'text',
      headerName: `End Time (${$plugins.time.primary.label})`,
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.end_time) {
          return formatDate(new Date(params.data?.end_time), $plugins.time.primary.format);
        }
      },
    },
    {
      field: 'created_at',
      filter: 'text',
      headerName: `Created At (${$plugins.time.primary.label})`,
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.valid_at) {
          return formatDate(new Date(params.data?.created_at), $plugins.time.primary.format);
        }
      },
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: SourceCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: data => params.onDeleteExternalSource([data]),
            deleteTooltip: {
              content: 'Delete External Source',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeleteExternalSourcePermissionOnRow(user, params.data),
            rowData: params.data,
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        onDeleteExternalSource,
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

  // Selected elements and values
  $: effects
    .getExternalEvents(
      selectedSource ? selectedSource.key : null,
      selectedSource ? selectedSource.derivation_group_name : null,
      user,
    )
    .then(fetched => (selectedEvents = fetched));

  $: effects
    .getExternalEventTypesBySource(
      selectedSource ? selectedSource.key : null,
      selectedSource ? selectedSource.derivation_group_name : null,
      user,
    )
    .then(fetched => (selectedSourceEventTypes = fetched));

  $: selectedSourceLinkedDerivationGroupsPlans = $planDerivationGroupLinks.filter(planDerivationGroupLink => {
    return planDerivationGroupLink.derivation_group_name === selectedSource?.derivation_group_name;
  });

  $: isUploadDisabled = file === undefined;

  // Permissions
  $: hasCreatePermission = featurePermissions.externalSource.canCreate(user);

  async function onDeleteExternalSource(selectedSources: ExternalSourceSlim[] | null | undefined) {
    if (selectedSources !== null && selectedSources !== undefined) {
      const deleteExternalSourceResult = await effects.deleteExternalSource(
        selectedSources,
        $planDerivationGroupLinks,
        user,
      );
      if (deleteExternalSourceResult !== undefined && deleteExternalSourceResult !== null) {
        deselectSource();
        selectedSources = null;
        selectedSource = null;
      }
    }
  }

  async function onFormSubmit(_e: SubmitEvent) {
    if (file) {
      resetErrors();
      const requestResponse: ExternalSourceSlim | null = await effects.createExternalSource(
        $derivationGroupField.value,
        file,
        user,
      );
      // Following a successful mutation...
      if (requestResponse !== null) {
        // Auto-select the new source
        selectedSource = {
          ...requestResponse,
          created_at: switchISOTimezoneRepresentation(new Date().toISOString()), // technically not the exact time it shows up in the database
        };
        gridRowSizes = gridRowSizesBottomPanel;
      }
      // Reset the form behind the source
      onReset();
    }
  }

  async function selectSource(detail: ExternalSourceSlim) {
    deselectSource();
    selectedSource = detail;
    gridRowSizes = gridRowSizesBottomPanel;
    deselectEvent();
  }

  function deselectSource() {
    deselectEvent();
    gridRowSizes = gridRowSizesNoBottomPanel;
    selectedSource = null;
    selectedSourceAttributes = {};
    selectedSourceTypeParametersMap = {};
  }

  function deselectEvent() {
    selectedEvent = null;
    selectedRowId = null;
  }

  function onSelectionChanged(e: CustomEvent) {
    if (e.detail && e.detail.length > 0) {
      selectedRowId = getExternalEventRowId(e.detail[0].pkey);
      selectedEvent = e.detail[0];
    }
  }

  function hasDeleteExternalSourcePermissionOnRow(user: User | null, externalSource: ExternalSourceSlim | undefined) {
    if (externalSource === undefined) {
      return false;
    } else {
      return featurePermissions.externalSource.canDelete(user, [externalSource]);
    }
  }

  function onReset() {
    files = undefined;
    file = undefined;
    externalSourceFileInput.value = '';
  }

  function resetErrors() {
    $createExternalSourceError = null;
    $createDerivationGroupError = null;
  }
</script>

<CssGrid columns={uiColumnSize}>
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>
        {selectedEvent ? `Selected Event` : selectedSource ? `Selected External Source` : 'Upload a Source File'}
      </SectionTitle>
      {#if selectedEvent}
        <button
          class="st-button icon fs-6"
          on:click={deselectEvent}
          use:tooltip={{ content: 'Deselect event', placement: 'top' }}
        >
          <XIcon />
        </button>
      {:else if selectedSource}
        <button
          class="st-button icon fs-6"
          on:click={deselectSource}
          use:tooltip={{ content: 'Deselect source', placement: 'top' }}
        >
          <XIcon />
        </button>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if selectedEvent}
        <ExternalEventForm externalEvent={selectedEvent} showHeader={true} />
      {:else if selectedSource}
        <div class="external-source-header">
          <div class="external-source-header-title">
            <div class="external-source-header-title-value st-typography-medium">
              {selectedSource.key}
            </div>
          </div>
        </div>
        <div class="selected-source-forms">
          <fieldset>
            <Input layout="inline">
              Source Type
              <input
                class="st-input w-full"
                disabled={true}
                name="source-type"
                value={selectedSource.source_type_name}
              />
            </Input>

            <Input layout="inline">
              Derivation Group
              <input
                class="st-input w-full"
                disabled={true}
                name="derivation-group"
                value={selectedSource.derivation_group_name}
              />
            </Input>

            <Input layout="inline">
              Owner
              <input class="st-input w-full" disabled={true} name="owner" value={selectedSource.owner} />
            </Input>

            <Input layout="inline">
              {`Start Time (${$plugins.time.primary.label})`}
              <DatePicker
                dateString={formatDate(new Date(selectedSource.start_time), $plugins.time.primary.format)}
                disabled={true}
                name="start-time"
              />
            </Input>

            <Input layout="inline">
              {`End Time (${$plugins.time.primary.label})`}
              <DatePicker
                dateString={formatDate(new Date(selectedSource.end_time), $plugins.time.primary.format)}
                disabled={true}
                name="end-time"
              />
            </Input>

            <Input layout="inline">
              {`Valid At (${$plugins.time.primary.label})`}
              <DatePicker
                dateString={formatDate(new Date(selectedSource.valid_at), $plugins.time.primary.format)}
                disabled={true}
                name="valid-at"
              />
            </Input>

            <Input layout="inline">
              {`Created At (${$plugins.time.primary.label})`}
              <DatePicker
                dateString={formatDate(new Date(selectedSource.created_at), $plugins.time.primary.format)}
                disabled={true}
                name="valid-at"
              />
            </Input>

            <Collapse defaultExpanded={false} title="Event Types" tooltipContent="View Contained Event Types">
              {#if selectedSourceEventTypes.length > 0}
                {#each selectedSourceEventTypes as eventType}
                  <div class="st-typography-body collapse-important-text">
                    {eventType.name}
                  </div>
                {/each}
              {:else}
                <div class="st-typography-body collapse-important-text">No external event types found.</div>
              {/if}
            </Collapse>
            <Collapse
              className="used-in-plans-collapse"
              defaultExpanded={false}
              title="Used in Plans"
              tooltipContent="View plans this source is used in"
            >
              {#if selectedSourceLinkedDerivationGroupsPlans.length > 0}
                {#each selectedSourceLinkedDerivationGroupsPlans as linkedPlanDerivationGroup}
                  <div class="st-typography-body collapse-important-text">
                    <a href="{base}/plans/{linkedPlanDerivationGroup.plan_id}">
                      {($plans || []).find(plan => {
                        return linkedPlanDerivationGroup.plan_id === plan.id;
                      })?.name}
                    </a>
                  </div>
                {/each}
              {:else}
                <div class="st-typography-body">Not used in any plans</div>
              {/if}
            </Collapse>
            <Collapse defaultExpanded={false} title="Attributes" tooltipContent="View External Source Attributes">
              <div class="st-typography-body">
                {#if Object.keys(selectedSourceAttributes).length > 0}
                  <Parameters
                    disabled={true}
                    expanded={false}
                    formParameters={getFormParameters(
                      selectedSourceTypeParametersMap,
                      selectedSourceAttributes,
                      [],
                      undefined,
                      undefined,
                      [],
                      'option',
                      true,
                    )}
                  />
                {:else}
                  No Attributes
                {/if}
              </div>
            </Collapse>
            <div class="selected-source-delete">
              <button
                class="st-button danger w-full"
                use:permissionHandler={{
                  hasPermission: hasDeleteExternalSourcePermissionOnSelectedSource,
                  permissionError: deletePermissionError,
                }}
                on:click|stopPropagation={async () => {
                  if (selectedSource !== null) {
                    onDeleteExternalSource([selectedSource]);
                  }
                }}
              >
                Delete external source
              </button>
            </div>
          </fieldset>
        </div>
      {:else}
        <form on:submit|preventDefault={onFormSubmit} on:reset={onReset}>
          <AlertError class="m-2" error={$createExternalSourceError} />
          <div class="file-upload-field">
            <fieldset style:flex={1}>
              <label for="file">Source File</label>
              <input
                class="w-full"
                name="file"
                required
                type="file"
                bind:files
                bind:this={externalSourceFileInput}
                use:permissionHandler={{
                  hasPermission: hasCreatePermission,
                  permissionError: createPermissionError,
                }}
              />
            </fieldset>

            <fieldset class="file-upload-fieldset">
              {#if file !== undefined}
                <div style="padding-top:12px">
                  <button class="st-button secondary w-full" type="reset">Dismiss</button>
                </div>
              {/if}
              <button
                disabled={isUploadDisabled}
                class="st-button w-full"
                type="submit"
                use:permissionHandler={{
                  hasPermission: hasCreatePermission,
                  permissionError: createPermissionError,
                }}
              >
                {$creatingExternalSource ? 'Uploading...' : 'Upload'}
              </button>
            </fieldset>
          </div>
          {#if file !== undefined}
            <Field field={derivationGroupField}>
              <label for="derivation-group" slot="label">
                Derivation Group
                <div class="inline text-xs text-muted-foreground">(If not specified in source)</div>
              </label>
              <input autocomplete="off" class="st-input w-full" name="derivation-group" />
            </Field>
          {/if}
        </form>
      {/if}
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <CssGrid rows={gridRowSizes}>
    <!-- External Source Table -->
    <Panel padBody={true}>
      <svelte:fragment slot="header">
        <slot name="left">
          <SectionTitle><ExternalSourceIcon slot="icon" />External Sources</SectionTitle>
          <div class="filter">
            <div class="timeline-editor-layer-filter">
              <Input>
                <input
                  type="search"
                  bind:value={filterExpression}
                  placeholder="Filter External Sources"
                  class="st-input"
                />
              </Input>
            </div>
          </div>
        </slot>
      </svelte:fragment>
      <svelte:fragment slot="body">
        {#if $externalSources.length}
          <div id="external-sources-table" style:height="100%">
            <BulkActionDataGrid
              bind:dataGrid
              {columnDefs}
              hasDeletePermission={hasDeleteExternalSourcePermissionOnRow}
              singleItemDisplayText="External Source"
              pluralItemDisplayText="External Sources"
              {filterExpression}
              items={$externalSources}
              {user}
              getRowId={getExternalSourceSlimRowId}
              on:rowClicked={({ detail }) => selectSource(detail.data)}
              on:bulkDeleteItems={({ detail }) => onDeleteExternalSource(detail)}
              bind:selectedItemId={selectedSourceId}
            />
          </div>
        {:else}
          <p>No external sources matching the selected external source type(s).</p>
        {/if}
      </svelte:fragment>
    </Panel>

    {#if selectedSource}
      <CssGridGutter track={1} type="row" />

      <!-- External Event Table/Timeline -->
      <Panel padBody={true}>
        <svelte:fragment slot="header">
          <slot name="left">
            <SectionTitle><ExternalEventIcon slot="icon" />External Events</SectionTitle>
            <div class="filter">
              <div class="timeline-editor-layer-filter">
                <Input>
                  <input
                    bind:value={externalEventsTableFilterString}
                    autocomplete="off"
                    class="st-input w-full"
                    name="filter-ee"
                    placeholder="Filter external events"
                  />
                </Input>
              </div>
            </div>
          </slot>
        </svelte:fragment>
        <svelte:fragment slot="body">
          {#if selectedSource}
            <div id="external-event-table">
              <ExternalEventsTable
                items={selectedEvents}
                filterExpression={externalEventsTableFilterString}
                bind:selectedItemId={selectedRowId}
                on:selectionChanged={onSelectionChanged}
                on:rowDoubleClicked={onSelectionChanged}
              />
            </div>
          {:else if $externalSources.length}
            <p class="selected-source-prompt">Select a source to view contents.</p>
          {:else}
            <p class="selected-source-prompt">No External Sources present.</p>
          {/if}
        </svelte:fragment>
      </Panel>
    {/if}
  </CssGrid>
</CssGrid>

<style>
  .filter {
    margin: 0.8rem 0;
  }

  .timeline-editor-layer-filter {
    display: flex;
    position: relative;
  }

  .timeline-editor-layer-filter :global(.input) {
    z-index: 1;
  }

  .external-source-header {
    align-items: center;
    background: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-15);
    display: flex;
    flex-shrink: 0;
    font-style: italic;
    padding: 4px 8px;
    padding-left: 8px;
  }

  .external-source-header-title {
    align-items: flex-start;
    border-radius: 4px;
    display: flex;
    width: 100%;
  }

  .external-source-header-title-value {
    overflow: hidden;
    padding: 4px 0px;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-word;
    word-break: break-all;
  }

  .file-upload-field {
    display: flex;
    flex-direction: row;
    white-space: nowrap;
  }

  .file-upload-fieldset {
    align-items: flex-end;
    flex-direction: row;
    gap: 4px;
  }

  #external-event-table {
    height: 100%;
    position: relative;
    width: 100%;
  }

  .filter {
    float: left;
    margin-right: auto;
    padding-left: 5px;
    padding-right: 5px;
  }

  .selected-source-forms {
    height: 100%;
  }

  .selected-source-prompt {
    padding-left: 4px;
  }

  .selected-source-delete {
    padding-top: 12px;
  }

  .collapse-important-text {
    font-style: italic;
  }
</style>
