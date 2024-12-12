<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import type { ICellRendererParams } from 'ag-grid-community';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import { externalEventTypes } from '../../stores/external-event';
  import {
    createExternalSourceEventTypeError,
    derivationGroups,
    externalSources,
    externalSourceTypes,
    sourcesUsingExternalEventTypes,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExternalEventType } from '../../types/external-event';
  import type {
    DerivationGroup,
    ExternalSourceEventTypeSchema,
    ExternalSourceSlim,
    ExternalSourceType,
  } from '../../types/external-source';
  import type { ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import effects from '../../utilities/effects';
  import {
    getDerivationGroupRowId,
    getExternalEventTypeRowId,
    getExternalSourceTypeRowId,
  } from '../../utilities/externalEvents';
  import { parseJSONStream } from '../../utilities/generic';
  import { showDeleteDerivationGroupModal, showDeleteExternalEventSourceTypeModal } from '../../utilities/modal';
  import { getFormParameters, translateJsonSchemaToValueSchema } from '../../utilities/parameters';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteDerivationGroup: (derivationGroup: DerivationGroup) => Promise<void>;
    deleteExternalEventType: (eventType: ExternalEventType) => Promise<void>;
    deleteExternalSourceType: (sourceType: ExternalSourceType) => Promise<void>;
    viewDerivationGroup: (derivationGroup: DerivationGroup) => void;
    viewExternalEventType: (eventType: ExternalEventType) => void;
    viewExternalSourceType: (sourceType: ExternalSourceType) => void;
  };
  type ModalCellRendererParamsDerivationGroup = ICellRendererParams<DerivationGroup> & CellRendererParams;
  type ModalCellRendererParamsExternalSourceType = ICellRendererParams<ExternalSourceType> & CellRendererParams;
  type ModalCellRendererParamsExternalEventType = ICellRendererParams<ExternalEventType> & CellRendererParams;

  const columnSize: string = '.55fr 3px 1.5fr';

  const creationPermissionError: string = 'You do not have permission to upload External Source & Event Types.';

  const derivationGroupBaseColumnDefs: DataGridColumnDef<DerivationGroup>[] = [
    {
      field: 'name',
      filter: 'string',
      headerName: 'Derivation Group',
      resizable: true,
      sortable: true,
    },
    {
      field: 'source_type_name',
      filter: 'string',
      headerName: 'Source Type',
      resizable: true,
      sortable: true,
    },
    {
      field: 'derived_event_total',
      filter: 'number',
      headerName: 'Derived Events in Derivation Group',
      sortable: true,
      valueFormatter: params => {
        return params?.value.length;
      },
      width: 200,
    },
    {
      field: 'sources',
      filter: 'number',
      headerName: 'Associated External Sources',
      sortable: true,
      valueFormatter: params => {
        return params?.value.size;
      },
      width: 250,
    },
    {
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      resizable: true,
      sortable: true,
      width: 100,
    },
  ];
  const externalSourceTypeBaseColumnDefs: DataGridColumnDef<ExternalSourceType>[] = [
    {
      field: 'name',
      filter: 'string',
      headerName: 'External Source Type',
      resizable: true,
      sortable: true,
    },
  ];
  const externalEventTypeBaseColumnDefs: DataGridColumnDef<ExternalEventType>[] = [
    {
      field: 'name',
      filter: 'string',
      headerName: 'External Event Type',
      resizable: true,
      sortable: true,
    },
  ];

  let derivationGroupColumnsDef: DataGridColumnDef<DerivationGroup>[] = derivationGroupBaseColumnDefs;
  let externalSourceTypeColumnDefs: DataGridColumnDef<ExternalSourceType>[] = externalSourceTypeBaseColumnDefs;
  let externalEventTypeColumnDefs: DataGridColumnDef<ExternalEventType>[] = externalEventTypeBaseColumnDefs;

  let derivationGroupDataGrid: DataGrid<DerivationGroup>;
  let externalSourceTypeDataGrid: DataGrid<ExternalSourceType>;
  let externalEventTypeDataGrid: DataGrid<ExternalEventType>;

  let hasDeleteExternalSourceTypePermission: boolean = false;
  let hasDeleteExternalEventTypePermission: boolean = false;
  let hasCreateExternalSourceTypePermission: boolean = false;
  let hasCreateExternalEventTypePermission: boolean = false;
  let hasCreationPermission: boolean = false;

  let derivationGroupFilterString: string = '';
  let externalSourceTypeFilterString: string = '';
  let externalEventTypeFilterString: string = '';

  let selectedDerivationGroup: DerivationGroup | undefined = undefined;
  let selectedDerivationGroupSources: ExternalSourceSlim[] = [];

  let selectedExternalSourceType: ExternalSourceType | undefined = undefined;
  let selectedExternalSourceTypeDerivationGroups: DerivationGroup[] = [];
  let selectedExternalSourceTypeAttributeSchema: Record<string, ValueSchema>;
  let selectedExternalSourceTypeParametersMap: ParametersMap = {};

  let selectedExternalEventType: ExternalEventType | undefined = undefined;
  let selectedExternalEventTypeSources: string[] = [];
  let selectedExternalEventTypeAttributesSchema: Record<string, ValueSchema>;
  let selectedExternalEventTypeParametersMap: ParametersMap = {};

  let fileInput: HTMLInputElement | null;
  let uploadResponseErrors: string[] = [];
  let files: FileList | undefined;
  let file: File | undefined;
  let parsedExternalSourceEventTypeSchema: ExternalSourceEventTypeSchema | undefined = undefined;

  $: hasDeleteExternalSourceTypePermission = featurePermissions.externalSourceType.canDelete(user);
  $: hasDeleteExternalEventTypePermission = featurePermissions.externalEventType.canDelete(user);
  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);
  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);
  $: hasCreationPermission = hasCreateExternalEventTypePermission && hasCreateExternalSourceTypePermission;

  $: selectedDerivationGroupSources = $externalSources.filter(
    source => selectedDerivationGroup?.name === source.derivation_group_name,
  );

  $: if (selectedExternalEventType !== undefined) {
    selectedExternalEventTypeSources = getAssociatedExternalSourcesByEventType(selectedExternalEventType.name);
  } else {
    selectedExternalEventTypeSources = [];
  }

  $: if (selectedExternalEventType !== undefined) {
    selectedExternalEventTypeAttributesSchema = translateJsonSchemaToValueSchema(
      selectedExternalEventType?.attribute_schema,
    );
    selectedExternalEventTypeParametersMap = Object.entries(selectedExternalEventTypeAttributesSchema).reduce(
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

  $: if (selectedExternalSourceType !== undefined) {
    selectedExternalSourceTypeAttributeSchema = translateJsonSchemaToValueSchema(
      selectedExternalSourceType?.attribute_schema,
    );
    selectedExternalSourceTypeParametersMap = Object.entries(selectedExternalSourceTypeAttributeSchema).reduce(
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

  $: selectedExternalSourceTypeDerivationGroups = $derivationGroups.filter(derivationGroup => {
    if (selectedExternalSourceType !== undefined) {
      return derivationGroup.source_type_name === selectedExternalSourceType.name;
    } else {
      return false;
    }
  });

  $: if (files) {
    if (file !== files[0]) {
      file = files[0];
      if (file !== undefined && /\.json$/.test(file.name)) {
        parseExternalSourceEventTypeFileStream(file.stream());
      } else {
        createExternalSourceEventTypeError.set('External Source & Event Type(s) schema is not a .json file');
      }
    }
  }

  $: derivationGroupColumnsDef = [
    ...derivationGroupBaseColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ModalCellRendererParamsDerivationGroup) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteDerivationGroup,
            deleteTooltip: {
              content: 'Delete Derivation Group',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeleteDerivationGroupPermissionOnRow(params.data),
            rowData: params.data,
            viewCallback: params.viewDerivationGroup,
            viewTooltip: {
              content: 'View Derivation Group',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });
        return actionsDiv;
      },
      cellRendererParams: {
        deleteDerivationGroup,
        viewDerivationGroup,
      } as CellRendererParams,
      headerName: '',
      resizable: false,
      sortable: false,
      width: 80,
    },
  ];

  $: externalSourceTypeColumnDefs = [
    ...externalSourceTypeBaseColumnDefs,
    {
      filter: 'number',
      headerName: 'Associated External Sources',
      sortable: true,
      valueFormatter: params => {
        const associatedSources = getAssociatedExternalSourcesBySourceType(params.data?.name);
        return `${associatedSources.length}`;
      },
    },
    {
      filter: 'number',
      headerName: 'Associated Derivation Groups',
      sortable: true,
      valueFormatter: params => {
        const associatedDerivationGroups = getAssociatedDerivationGroupsBySourceTypeName(params.data?.name);
        return `${associatedDerivationGroups.length}`;
      },
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ModalCellRendererParamsExternalSourceType) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteExternalSourceType,
            deleteTooltip: {
              content: 'Delete External Source Type',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeleteExternalSourceTypePermission,
            rowData: params.data,
            viewCallback: params.viewExternalSourceType,
            viewTooltip: {
              content: 'View External Source Type',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteExternalSourceType,
        viewExternalSourceType,
      } as CellRendererParams,
      headerName: '',
      resizable: false,
      sortable: false,
      width: 60,
    },
  ];

  $: externalEventTypeColumnDefs = [
    ...externalEventTypeBaseColumnDefs,
    {
      filter: 'number',
      headerName: 'Associated External Sources',
      sortable: true,
      valueFormatter: params => {
        const associatedExternalSources = getAssociatedExternalSourcesByEventType(params.data?.name);
        return `${associatedExternalSources.length}`;
      },
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ModalCellRendererParamsExternalEventType) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteExternalEventType,
            deleteTooltip: {
              content: 'Delete External Event Type',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeleteExternalEventTypePermission,
            rowData: params.data,
            viewCallback: params.viewExternalEventType,
            viewTooltip: {
              content: 'View External Event Type',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteExternalEventType,
        viewExternalEventType,
      } as CellRendererParams,
      headerName: '',
      resizable: false,
      sortable: false,
      width: 60,
    },
  ];

  function deleteDerivationGroup(derivationGroup: DerivationGroup) {
    // Makes sure all associated sources are deleted before this. List of sources already contained in DerivationGroup type.
    showDeleteDerivationGroupModal(derivationGroup, user);
  }

  function deleteExternalSourceType(sourceType: ExternalSourceType) {
    // Makes sure all associated derivation groups are deleted before this
    showDeleteExternalEventSourceTypeModal(
      sourceType,
      'External Source Type',
      $externalSources.filter(source => source.source_type_name === sourceType.name).map(source => source.key),
      user,
    );
  }

  function deleteExternalEventType(eventType: ExternalEventType) {
    // Makes sure all associated sources (and therefore events, as orphans are not possible) are deleted before this
    // NOTE: does not update in derivation_group_comp after removing a EE type; derivation_group_comp defaults to 0 event types after its last external source removed,
    //        as it has no awareness of external source type or paired events (as the latter don't even exist).
    showDeleteExternalEventSourceTypeModal(
      eventType,
      'External Event Type',
      $sourcesUsingExternalEventTypes.filter(entry => entry.types.includes(eventType.name)).map(entry => entry.key), // NOTE: MAY NEED TO REMOVE THIS - COULD BE A VERY SLOW OPERATION.
      user,
    );
  }

  function getAssociatedExternalSourcesByEventType(eventType: string | undefined) {
    if (eventType === undefined) {
      return [];
    }
    const associatedSources = $sourcesUsingExternalEventTypes
      .filter(entry => entry.types.includes(eventType))
      .map(entry => entry.key); // NOTE: MAY NEED TO REMOVE THIS - COULD BE A VERY SLOW OPERATION.
    return associatedSources;
  }

  function getAssociatedExternalSourcesBySourceType(sourceType: string | undefined) {
    if (sourceType === undefined) {
      return [];
    }
    let associatedSources = $externalSources.filter(source => source.source_type_name === sourceType);
    return associatedSources;
  }

  function getAssociatedDerivationGroupsBySourceTypeName(sourceTypeName: string | undefined) {
    if (sourceTypeName === undefined) {
      return [];
    }

    let associatedDerivationGroups = $derivationGroups.filter(
      derivationGroup => derivationGroup.source_type_name === sourceTypeName,
    );

    return associatedDerivationGroups;
  }

  function viewDerivationGroup(viewedDerivationGroup: DerivationGroup) {
    const derivationGroup = $derivationGroups.find(
      derivationGroup => derivationGroup.name === viewedDerivationGroup.name,
    );
    if (
      (selectedDerivationGroup === undefined && derivationGroup !== undefined) ||
      selectedDerivationGroup !== derivationGroup
    ) {
      selectedDerivationGroup = derivationGroup;
      selectedExternalSourceType = undefined;
      selectedExternalEventType = undefined;
      parsedExternalSourceEventTypeSchema = undefined;
    } else {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = undefined;
      selectedExternalEventType = undefined;
      parsedExternalSourceEventTypeSchema = undefined;
    }
    resetUploadForm();
  }

  function viewExternalSourceType(sourceType: ExternalSourceType) {
    if (selectedExternalSourceType === undefined || selectedExternalSourceType !== sourceType) {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = sourceType;
      selectedExternalEventType = undefined;
      parsedExternalSourceEventTypeSchema = undefined;
    } else {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = undefined;
      selectedExternalEventType = undefined;
      parsedExternalSourceEventTypeSchema = undefined;
    }
    resetUploadForm();
  }

  function viewExternalEventType(eventType: ExternalEventType) {
    if (selectedExternalEventType === undefined || selectedExternalEventType !== eventType) {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = undefined;
      selectedExternalEventType = eventType;
    } else {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = undefined;
      selectedExternalEventType = undefined;
    }
    resetUploadForm();
  }

  function hasDeleteDerivationGroupPermissionOnRow(derivationGroup: DerivationGroup | undefined) {
    if (derivationGroup === undefined) {
      return false;
    } else {
      return featurePermissions.derivationGroup.canDelete(user, derivationGroup);
    }
  }

  function resetUploadForm() {
    if (fileInput !== null) {
      fileInput.value = '';
    }
    file = undefined;
    files = undefined;
    uploadResponseErrors = [];
    parsedExternalSourceEventTypeSchema = undefined;
  }

  function onClick() {
    resetUploadForm();
  }

  async function handleUpload() {
    if (files) {
      file = files[0];
      if (file !== undefined && /\.json$/.test(file.name)) {
        uploadResponseErrors = [];
        const combinedSchema = await parseJSONStream<{ event_types: object; source_types: object }>(file.stream());
        await effects.createExternalSourceEventTypes(combinedSchema.event_types, combinedSchema.source_types, user);
        files = undefined;
        file = undefined;
        if (fileInput != null) {
          fileInput.value = '';
        }
        parsedExternalSourceEventTypeSchema = undefined;
      }
    }
  }

  async function parseExternalSourceEventTypeFileStream(stream: ReadableStream) {
    createExternalSourceEventTypeError.set(null);

    try {
      parsedExternalSourceEventTypeSchema = await parseJSONStream<ExternalSourceEventTypeSchema>(stream);
      if (!parsedExternalSourceEventTypeSchema.event_types || !parsedExternalSourceEventTypeSchema.source_types) {
        parsedExternalSourceEventTypeSchema = undefined;
        throw new Error('External Source & Event Type Schema has Invalid Format');
      }
    } catch (error) {
      createExternalSourceEventTypeError.set('External Source & Event Type Schema has Invalid Format');
    }
  }
</script>

<CssGrid class="type-manager-grid" columns={columnSize} minHeight="100%">
  {#if selectedDerivationGroup === undefined && selectedExternalSourceType === undefined && selectedExternalEventType === undefined}
    <Panel borderLeft borderTop padBody={true}>
      <svelte:fragment slot="header">
        <SectionTitle overflow="hidden">Upload Type Definition</SectionTitle>
      </svelte:fragment>
      <svelte:fragment slot="body">
        <div>
          <div class="type-creation-input">
            <label for="file">Type JSON Schema File</label>
            <input
              bind:this={fileInput}
              class="w-100 upload"
              class:error={!!uploadResponseErrors.length}
              name="file"
              required
              type="file"
              accept="application/json"
              bind:files
              on:click={onClick}
            />
          </div>
          {#if file !== undefined}
            <button
              class="st-button primary"
              style:width="100%"
              disabled={parsedExternalSourceEventTypeSchema === undefined}
              on:click={handleUpload}
              use:permissionHandler={{
                hasPermission: hasCreationPermission,
                permissionError: creationPermissionError,
              }}
              use:tooltip={{ content: 'Upload External Source & Event Type(s)' }}
            >
              Upload
            </button>
            {#if parsedExternalSourceEventTypeSchema !== undefined}
              <div class="parse-status st-typography-body">
                <div class="check">
                  <CheckIcon />
                </div>
                Source & Event Type Attribute Schema Parsed
              </div>
            {:else}
              <WarningIcon />
              <div class="status-text st-typography-body">Source & Event Type Attribute Schema Could Not Be Parsed</div>
            {/if}
          {/if}
          {#if parsedExternalSourceEventTypeSchema !== undefined}
            <div class="to-be-created st-typography-body">
              <div class="to-be-created-header">The following External Source Type(s) will be created</div>
              <ul>
                {#each Object.keys(parsedExternalSourceEventTypeSchema.source_types) as newSourceTypeName}
                  <li class="st-typograph-body">{newSourceTypeName}</li>
                {/each}
              </ul>
              <div class="to-be-created-header">The following External Event Type(s) will be created</div>
              <ul>
                {#each Object.keys(parsedExternalSourceEventTypeSchema.event_types) as newEventTypeName}
                  <li class="st-typograph-body">{newEventTypeName}</li>
                {/each}
              </ul>
            </div>
          {/if}
          <div class="errors">
            {#each uploadResponseErrors as currentError}
              <AlertError class="m-2" error={currentError} />
            {/each}
            <AlertError class="m-2" error={$createExternalSourceEventTypeError} />
          </div>
        </div>
      </svelte:fragment>
    </Panel>
    <CssGridGutter track={1} type="column" />
  {:else if selectedDerivationGroup !== undefined}
    <Panel borderRight borderTop padBody={true}>
      <svelte:fragment slot="header">
        <SectionTitle overflow="hidden">
          <ExternalSourceIcon slot="icon" />Sources in '{selectedDerivationGroup.name}'
        </SectionTitle>
        <button
          class="st-button icon fs-6 deselect"
          on:click|stopPropagation={() => {
            selectedDerivationGroup = undefined;
          }}
        >
          <XIcon />
        </button>
      </svelte:fragment>
      <svelte:fragment slot="body">
        {#if selectedDerivationGroupSources.length > 0}
          {#each selectedDerivationGroupSources as source}
            <!-- Collapsible details -->
            <Collapse title={source.key} tooltipContent={source.key} defaultExpanded={false}>
              <svelte:fragment slot="right">
                <p class="st-typography-body derived-event-count">
                  {selectedDerivationGroup.sources.get(source.key)?.event_counts} events
                </p>
              </svelte:fragment>
              <div class="st-typography-body">
                <div class="st-typography-bold">Key:</div>
                {source.key}
              </div>

              <div class="st-typography-body">
                <div class="st-typography-bold">Source Type:</div>
                {source.source_type_name}
              </div>

              <div class="st-typography-body">
                <div class="st-typography-bold">Start Time:</div>
                {source.start_time}
              </div>

              <div class="st-typography-body">
                <div class="st-typography-bold">End Time:</div>
                {source.end_time}
              </div>

              <div class="st-typography-body">
                <div class="st-typography-bold">Valid At:</div>
                {source.valid_at}
              </div>

              <div class="st-typography-body">
                <div class="st-typography-bold">Created At:</div>
                {source.created_at}
              </div>
            </Collapse>
          {/each}
        {:else}
          <p class="st-typography-body">No sources in this group.</p>
        {/if}
      </svelte:fragment>
    </Panel>
    <CssGridGutter track={1} type="column" />
  {:else if selectedExternalSourceType !== undefined}
    <Panel borderRight borderTop padBody={true}>
      <svelte:fragment slot="header">
        <SectionTitle overflow="hidden">
          <ExternalSourceIcon slot="icon" />'{selectedExternalSourceType.name}' Details
        </SectionTitle>
        <button
          class="st-button icon fs-6 deselect"
          on:click|stopPropagation={() => {
            selectedExternalSourceType = undefined;
          }}
        >
          <XIcon />
        </button>
      </svelte:fragment>
      <svelte:fragment slot="body">
        {#if selectedExternalSourceTypeDerivationGroups.length > 0}
          {#each selectedExternalSourceTypeDerivationGroups as associatedDerivationGroup}
            <!-- Collapsible details -->
            <Collapse
              title={associatedDerivationGroup.name}
              tooltipContent={associatedDerivationGroup.name}
              defaultExpanded={false}
            >
              <svelte:fragment slot="right">
                <p class="st-typography-body derived-event-count">
                  {associatedDerivationGroup.derived_event_total} events
                </p>
              </svelte:fragment>
              <div>
                <div class="st-typography-bold">Name:</div>
                {associatedDerivationGroup.name}
              </div>

              <Collapse defaultExpanded={false} title="Sources" tooltipContent="View Contained External Sources">
                {#each associatedDerivationGroup.sources as source}
                  <i class="st-typography-body">{source[0]}</i>
                {/each}
              </Collapse>
            </Collapse>
          {/each}
        {:else}
          <p class="st-typography-body">No sources associated with this External Source Type.</p>
        {/if}
        <Collapse
          title="Attribute Schema - Definition"
          tooltipContent={`${selectedExternalSourceType.name} Attribute Schema Definition`}
          defaultExpanded={false}
        >
          {#each Object.entries(selectedExternalSourceType.attribute_schema) as attribute}
            {#if attribute[0] !== 'properties'}
              <div class="st-typography-body attributes">
                <div class="attribute-name">{attribute[0]}</div>
                {#if Array.isArray(attribute[1])}
                  <ul class="attribute-array">
                    {#each attribute[1] as attributeValue}
                      <li class="attribute-value">{attributeValue}</li>
                    {/each}
                  </ul>
                {:else}
                  <div class="attribute-value">{attribute[1]}</div>
                {/if}
              </div>
            {/if}
          {/each}
        </Collapse>
        <Collapse
          title="Attribute Schema - Properties"
          tooltipContent={`${selectedExternalSourceType.name} Attribute Schema Properties`}
          defaultExpanded={false}
        >
          <div class="st-typography-body">
            <Parameters
              disabled={true}
              expanded={false}
              formParameters={getFormParameters(selectedExternalSourceTypeParametersMap, {}, [])}
            />
          </div>
        </Collapse>
      </svelte:fragment>
    </Panel>
    <CssGridGutter track={1} type="column" />
  {:else if selectedExternalEventType !== undefined}
    <Panel borderRight borderTop padBody={true}>
      <svelte:fragment slot="header">
        <SectionTitle overflow="hidden">
          <ExternalSourceIcon slot="icon" />'{selectedExternalEventType.name}' Details
        </SectionTitle>
        <button
          class="st-button icon fs-6 deselect"
          on:click|stopPropagation={() => {
            selectedExternalEventType = undefined;
          }}
        >
          <XIcon />
        </button>
      </svelte:fragment>
      <svelte:fragment slot="body">
        <Collapse
          title="Associated External Sources"
          tooltipContent={`External Sources using ${selectedExternalEventType.name}`}
          defaultExpanded={false}
        >
          {#if selectedExternalEventTypeSources.length > 0}
            {#each selectedExternalEventTypeSources as associatedSource}
              <li class="st-typography-body associated-sources">{associatedSource}</li>
            {/each}
          {:else}
            {`No External Sources using ${selectedExternalEventType.name}`}
          {/if}
        </Collapse>
        <Collapse
          title="Attribute Schema - Definition"
          tooltipContent={`${selectedExternalEventType.name} Attribute Schema Definition`}
          defaultExpanded={false}
        >
          {#each Object.entries(selectedExternalEventType.attribute_schema) as attribute}
            {#if attribute[0] !== 'properties'}
              <div class="st-typography-body attributes">
                <div class="attribute-name">{attribute[0]}</div>
                {#if Array.isArray(attribute[1])}
                  <ul class="attribute-array">
                    {#each attribute[1] as attributeValue}
                      <li class="attribute-value">{attributeValue}</li>
                    {/each}
                  </ul>
                {:else}
                  <div class="attribute-value">{attribute[1]}</div>
                {/if}
              </div>
            {/if}
          {/each}
        </Collapse>
        <Collapse
          title="Attribute Schema - Properties"
          tooltipContent={`${selectedExternalEventType.name} Attribute Schema Properties`}
          defaultExpanded={false}
        >
          <div class="st-typography-body">
            <Parameters
              disabled={true}
              expanded={false}
              formParameters={getFormParameters(selectedExternalEventTypeParametersMap, {}, [])}
            />
          </div>
        </Collapse>
      </svelte:fragment>
    </Panel>
    <CssGridGutter track={1} type="column" />
  {/if}
  <div class="table-container">
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>Derivation Groups</SectionTitle>
        <Input>
          <input
            type="search"
            bind:value={derivationGroupFilterString}
            placeholder="Filter Derivation Groups"
            class="st-input table-filter"
          />
        </Input>
      </svelte:fragment>
      <svelte:fragment slot="body">
        <div class="derivation-group-table">
          <DataGrid
            bind:this={derivationGroupDataGrid}
            columnDefs={derivationGroupColumnsDef}
            filterExpression={derivationGroupFilterString}
            rowData={$derivationGroups}
            getRowId={getDerivationGroupRowId}
          />
        </div>
      </svelte:fragment>
    </Panel>
    <Panel borderTop>
      <svelte:fragment slot="header">
        <SectionTitle>External Source Types</SectionTitle>
        <Input>
          <input
            type="search"
            bind:value={externalSourceTypeFilterString}
            placeholder="Filter External Source Types"
            class="st-input table-filter"
          />
        </Input>
      </svelte:fragment>
      <svelte:fragment slot="body">
        <div class="external-source-type-table">
          <DataGrid
            bind:this={externalSourceTypeDataGrid}
            columnDefs={externalSourceTypeColumnDefs}
            filterExpression={externalSourceTypeFilterString}
            rowData={$externalSourceTypes}
            getRowId={getExternalSourceTypeRowId}
          />
        </div>
      </svelte:fragment>
    </Panel>
    <Panel borderTop>
      <svelte:fragment slot="header">
        <SectionTitle>External Event Types</SectionTitle>
        <Input>
          <input
            type="search"
            bind:value={externalEventTypeFilterString}
            placeholder="Filter External Event Types"
            class="st-input table-filter"
          />
        </Input>
      </svelte:fragment>
      <svelte:fragment slot="body">
        <div class="external-event-type-table">
          <DataGrid
            bind:this={externalEventTypeDataGrid}
            columnDefs={externalEventTypeColumnDefs}
            filterExpression={externalEventTypeFilterString}
            rowData={$externalEventTypes}
            getRowId={getExternalEventTypeRowId}
          />
        </div>
      </svelte:fragment>
    </Panel>
  </div>
</CssGrid>

<style>
  .associated-sources {
    font-style: italic;
  }

  .table-container {
    display: grid;
  }

  .derivation-group-table {
    height: 100%;
  }

  .external-source-type-table {
    height: 100%;
  }

  .external-event-type-table {
    height: 100%;
  }

  :global(.type-manager-grid) {
    height: 100%;
  }

  .attribute-name {
    display: flex;
    font-weight: bold;
    justify-content: flex-start;
    width: 100%;
  }

  .attribute-value {
    color: var(--st-gray-60);
    display: flex;
    font-style: italic;
    justify-content: flex-end;
    text-align: right;
    width: 100%;
  }

  .attribute-array {
    margin-bottom: 0;
    margin-top: 0;
  }

  .attributes {
    display: flex;
    width: 100%;
  }

  .derived-event-count {
    color: var(--st-gray-60);
  }

  .type-creation-input {
    padding-bottom: 12px;
  }

  .errors {
    height: 100%;
  }

  .to-be-created-header {
    font-weight: bold;
    margin-top: 12px;
  }

  .parse-status {
    display: flex;
    margin-top: 12px;
  }

  .parse-status .check {
    background-color: #0eaf0a;
    border-radius: 50%;
    color: var(--st-white);
    display: flex;
    margin-right: 6px;
    max-height: 16px;
    max-width: 16px;
  }

  .deselect {
    display: flex;
    float: right;
  }

  .table-filter {
    width: 240px;
  }
</style>
