<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import ExternalEventIcon from '../../assets/external-event-box-with-arrow.svg?component';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import { catchError } from '../../stores/errors';
  import {
    createDerivationGroupError,
    createExternalSourceError,
    createExternalSourceTypeError,
    creatingExternalSource,
    externalSources,
    parsingError,
    planDerivationGroupLinks,
  } from '../../stores/external-source';
  import { field } from '../../stores/form';
  import { plans } from '../../stores/plans';
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExternalEvent, ExternalEventId } from '../../types/external-event';
  import {
    type ExternalSourceJson,
    type ExternalSourceSlim,
    type PlanDerivationGroup,
  } from '../../types/external-source';
  import effects from '../../utilities/effects';
  import {
    getExternalEventRowId,
    getExternalSourceRowId,
    getExternalSourceSlimRowId,
  } from '../../utilities/externalEvents';
  import { parseJSONStream } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { formatDate } from '../../utilities/time';
  import { showFailureToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import { required, timestamp } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import ExternalEventForm from '../external-events/ExternalEventForm.svelte';
  import ExternalEventsTable from '../external-events/ExternalEventsTable.svelte';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
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
      field: 'source_type',
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

  let keyInputField: HTMLInputElement; // need this to set a focus on it. not related to the value

  let keyField = field<string>('', [required]);
  let sourceTypeField = field<string>('', [required]); // need function to check if in list of allowable types...
  let derivationGroupField = field<string>('', [required]);
  let startTimeDoyField = field<string>('', [required, timestamp]); // requires validation function
  let endTimeDoyField = field<string>('', [required, timestamp]); // requires validation function
  let validAtDoyField = field<string>('', [required, timestamp]); // requires validation function

  // table variables
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;

  // for external events table
  let externalEventsTableFilterString: string = '';

  // source detail variables
  let selectedSource: ExternalSourceSlim | null = null;
  let selectedSourceId: string | null = null;
  let selectedSourceEventTypes: string[] = [];

  // Selected element variables
  let selectedEvent: ExternalEvent | null = null;
  let selectedRowId: ExternalEventId | null = null;
  let selectedEvents: ExternalEvent[] = [];

  // We want to parse a file selected for upload.
  let files: FileList | undefined;
  let file: File | undefined;
  let parsedExternalSource: ExternalSourceJson | undefined;

  // For filtering purposes (modelled after TimelineEditorLayerFilter):
  let filterExpression: string = '';

  // External source + derivation group creation variables
  let selectedSourceLinkedDerivationGroupsPlans: PlanDerivationGroup[] = [];

  // Permissions
  let hasDeleteExternalSourcePermissionOnSelectedSource: boolean = false;
  let hasCreatePermission: boolean = false;

  let isDerivationGroupFieldDisabled: boolean = true;

  let gridRowSizes: string = '1fr 3px 0fr';

  // Clear all error stores when a source is selected as they will not be shown
  $: if (selectedSource !== null) {
    createExternalSourceError.set(null);
    createExternalSourceTypeError.set(null);
    createDerivationGroupError.set(null);
    parsingError.set(null);
  }

  $: if (selectedSource !== null) {
    hasDeleteExternalSourcePermissionOnSelectedSource = featurePermissions.externalSource.canDelete(user, [
      selectedSource,
    ]);
  }

  $: selectedSourceId = selectedSource
    ? getExternalSourceRowId({ derivation_group_name: selectedSource.derivation_group_name, key: selectedSource.key })
    : null;

  // File parse logic
  $: if (files) {
    // Safeguard against infinitely executing parse logic
    if (file !== files[0]) {
      createExternalSourceError.set(null);
      createExternalSourceTypeError.set(null);
      createDerivationGroupError.set(null);
      parsingError.set(null);
      isDerivationGroupFieldDisabled = true;

      file = files[0];
      if (file !== undefined && /\.json$/.test(file.name)) {
        parseExternalSourceFileStream(file.stream());
      } else {
        parsingError.set('External Source file is not a .json file');
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
        selectedSources = null;
        selectedSource = null;
      }
    }
  }

  async function onFormSubmit(_e: SubmitEvent) {
    if (parsedExternalSource && file) {
      const createExternalSourceResponse: ExternalSourceSlim | undefined = await effects.createExternalSource(
        $sourceTypeField.value,
        $derivationGroupField.value,
        $startTimeDoyField.value,
        $endTimeDoyField.value,
        parsedExternalSource.events,
        parsedExternalSource.source.key,
        $validAtDoyField.value,
        user,
      );
      // Following a successful mutation...
      if (createExternalSourceResponse !== undefined) {
        // Auto-select the new source
        selectedSource = {
          ...createExternalSourceResponse,
          created_at: new Date().toISOString().replace('Z', '+00:00'), // technically not the exact time it shows up in the database
        };
        gridRowSizes = gridRowSizesBottomPanel;
      }
    }
    // Reset the form behind the source
    parsedExternalSource = undefined;
    keyField.reset('');
    sourceTypeField.reset('');
    startTimeDoyField.reset('');
    endTimeDoyField.reset('');
    validAtDoyField.reset('');
    derivationGroupField.reset('');
  }

  async function parseExternalSourceFileStream(stream: ReadableStream) {
    parsingError.set(null);
    try {
      try {
        parsedExternalSource = await parseJSONStream<ExternalSourceJson>(stream);
      } catch (error) {
        throw new Error('External Source has Invalid Format');
      }
      // Check for missing fields - if any are not present, throw an error
      if (
        parsedExternalSource.source.key === undefined ||
        parsedExternalSource.source.source_type === undefined ||
        parsedExternalSource.source.period.start_time === undefined ||
        parsedExternalSource.source.period.end_time === undefined ||
        parsedExternalSource.source.valid_at === undefined
      ) {
        throw new Error('Required field is missing in External Source');
      }
      $keyField.value = parsedExternalSource.source.key;
      $sourceTypeField.value = parsedExternalSource.source.source_type;
      $startTimeDoyField.value = parsedExternalSource.source.period.start_time.replaceAll('Z', '');
      $endTimeDoyField.value = parsedExternalSource.source.period.end_time.replaceAll('Z', '');
      $validAtDoyField.value = parsedExternalSource.source.valid_at.replaceAll('Z', '');
      $derivationGroupField.value = `${$sourceTypeField.value} Default`; // Include source type name because derivation group names are unique
      isDerivationGroupFieldDisabled = false;
    } catch (error) {
      catchError('External Source has Invalid Format', error as Error);
      showFailureToast('External Source has Invalid Format');
      parsingError.set('External Source has Invalid Format');
      parsedExternalSource = undefined;
    }
  }

  async function selectSource(detail: ExternalSourceSlim) {
    selectedSource = detail;
    gridRowSizes = gridRowSizesBottomPanel;
    deselectEvent();
  }

  function deselectSource() {
    deselectEvent();
    gridRowSizes = gridRowSizesNoBottomPanel;
    selectedSource = null;
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

  function onManageGroupsAndTypes() {
    effects.manageGroupsAndTypes(user);
  }

  function onCreateGroupsOrTypes() {
    effects.createGroupsOrTypes(user);
  }

  function hasDeleteExternalSourcePermissionOnRow(user: User | null, externalSource: ExternalSourceSlim | undefined) {
    if (externalSource === undefined) {
      return false;
    } else {
      return featurePermissions.externalSource.canDelete(user, [externalSource]);
    }
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
                class="st-input w-100"
                disabled={true}
                name="source-type"
                value={selectedSource.source_type_name}
              />
            </Input>

            <Input layout="inline">
              Derivation Group
              <input
                class="st-input w-100"
                disabled={true}
                name="derivation-group"
                value={selectedSource.derivation_group_name}
              />
            </Input>

            <Input layout="inline">
              Owner
              <input class="st-input w-100" disabled={true} name="owner" value={selectedSource.owner} />
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
                    {eventType}
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

            <div class="selected-source-delete">
              <button
                class="st-button danger w-100"
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
        <form
          on:submit|preventDefault={onFormSubmit}
          on:reset={() => {
            parsedExternalSource = undefined;
            $createExternalSourceError = null;
            $createExternalSourceTypeError = null;
            $createDerivationGroupError = null;
            $parsingError = null;
            isDerivationGroupFieldDisabled = true;
          }}
        >
          <AlertError class="m-2" error={$createExternalSourceError} />
          <AlertError class="m-2" error={$parsingError} />
          <div class="file-upload-field">
            <fieldset style:flex={1}>
              <label for="file">Source File</label>
              <input
                class="w-100"
                name="file"
                required
                type="file"
                bind:files
                use:permissionHandler={{
                  hasPermission: hasCreatePermission,
                  permissionError: createPermissionError,
                }}
              />
            </fieldset>

            <fieldset class="file-upload-fieldset">
              {#if parsedExternalSource}
                <div style="padding-top:12px">
                  <button class="st-button secondary w-100" type="reset">Dismiss</button>
                </div>
              {/if}
              <button
                disabled={!parsedExternalSource}
                class="st-button w-100"
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
          <Field field={derivationGroupField}>
            <label for="derivation-group" slot="label">Derivation Group</label>
            <input
              autocomplete="off"
              class="st-input w-100"
              name="derivation-group"
              disabled={isDerivationGroupFieldDisabled}
            />
          </Field>
          <Field field={keyField}>
            <label for="key" slot="label">Key</label>
            <input disabled bind:value={keyInputField} autocomplete="off" class="st-input w-100" name="key" required />
          </Field>

          <Field field={sourceTypeField}>
            <label for="source-type" slot="label">Source Type</label>
            <input disabled autocomplete="off" class="st-input w-100" name="source-type" required />
          </Field>

          <fieldset>
            <DatePickerField
              disabled={true}
              field={startTimeDoyField}
              label={`Start Time (${$plugins.time.primary.label}) - ${$plugins.time.primary.formatString}`}
              name="start-time"
            />
          </fieldset>

          <fieldset>
            <DatePickerField
              disabled={true}
              field={endTimeDoyField}
              label={`End Time (${$plugins.time.primary.label}) - ${$plugins.time.primary.formatString}`}
              name="end_time"
            />
          </fieldset>

          <fieldset>
            <DatePickerField
              disabled={true}
              field={validAtDoyField}
              label={`Valid At Time (${$plugins.time.primary.label}) - ${$plugins.time.primary.formatString}`}
              name="valid_at"
            />
          </fieldset>
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
        <slot name="right">
          <button
            name="create-groups-or-types"
            class="st-button secondary"
            on:click|stopPropagation={onCreateGroupsOrTypes}
            use:tooltip={{
              content: 'Create derivation groups, external source types, or external event types.',
              placement: 'top',
            }}
          >
            Create New Groups or Types
          </button>
          <button
            name="manage-groups-or-types"
            class="st-button active"
            on:click|stopPropagation={onManageGroupsAndTypes}
            use:tooltip={{
              content:
                'Manage and inspect existing derivation groups, external source types, and external event types.',
              placement: 'top',
            }}
          >
            Manage Groups and Types
          </button>
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
                    class="st-input w-100"
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
  :global(.plan-grid) {
    overflow: auto;
  }
  .filter {
    margin: 0.8rem 0;
  }

  :global(.source-grid) {
    height: 100%;
    width: 100%;
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
