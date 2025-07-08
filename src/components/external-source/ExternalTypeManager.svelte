<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import type { ICellRendererParams } from 'ag-grid-community';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import { externalEventTypeAssociations } from '../../stores/external-event';
  import {
    createExternalSourceEventTypeError,
    derivationGroups,
    externalSources,
    externalSourceTypeAssociations,
    sourcesUsingExternalEventTypes,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type {
    ExternalEventType,
    ExternalEventTypeAssociations,
    ExternalEventTypeId,
  } from '../../types/external-event';
  import type {
    DerivationGroup,
    DerivationGroupId,
    ExternalSourceEventTypeSchema,
    ExternalSourceSlim,
    ExternalSourceType,
    ExternalSourceTypeAssociations,
    ExternalSourceTypeId,
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
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteDerivationGroup: (derivationGroup: DerivationGroup) => Promise<void>;
    deleteExternalEventType: (eventType: ExternalEventType) => Promise<void>;
    deleteExternalSourceType: (sourceType: ExternalSourceType) => Promise<void>;
  };
  type ModalCellRendererParamsDerivationGroup = ICellRendererParams<DerivationGroup> & CellRendererParams;
  type ModalCellRendererParamsExternalSourceType = ICellRendererParams<ExternalSourceTypeAssociations> &
    CellRendererParams;
  type ModalCellRendererParamsExternalEventType = ICellRendererParams<ExternalEventType> & CellRendererParams;

  /** TODO
   * 1) Convert External Event Type deletion to new format
   * 2) Checkout that External Source Type deletion works
   */

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
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      resizable: true,
      sortable: true,
      width: 100,
    },
  ];
  const externalSourceTypeBaseColumnDefs: DataGridColumnDef<ExternalSourceTypeAssociations>[] = [
    {
      field: 'name',
      filter: 'string',
      headerName: 'External Source Type',
      resizable: true,
      sortable: true,
    },
    {
      field: 'source_associations',
      filter: 'number',
      headerName: 'Associated External Sources',
      resizable: true,
      sortable: true,
    },
    {
      field: 'derivation_group_associations',
      filter: 'number',
      headerName: 'Associated Derivation Groups',
      resizable: true,
      sortable: true,
    },
  ];
  const externalEventTypeBaseColumnDefs: DataGridColumnDef<ExternalEventTypeAssociations>[] = [
    {
      field: 'name',
      filter: 'string',
      headerName: 'External Event Type',
      resizable: true,
      sortable: true,
    },
    {
      field: 'source_associations',
      filter: 'number',
      headerName: 'Associated External Sources',
      resizable: true,
      sortable: true,
    },
  ];

  let derivationGroupColumnsDef: DataGridColumnDef<DerivationGroup>[] = derivationGroupBaseColumnDefs;
  let externalSourceTypeColumnDefs: DataGridColumnDef<ExternalSourceTypeAssociations>[] =
    externalSourceTypeBaseColumnDefs;
  let externalEventTypeColumnDefs: DataGridColumnDef<ExternalEventTypeAssociations>[] = externalEventTypeBaseColumnDefs;

  let hasDeleteExternalSourceTypePermission: boolean = false;
  let hasDeleteExternalEventTypePermission: boolean = false;
  let hasCreateExternalSourceTypePermission: boolean = false;
  let hasCreateExternalEventTypePermission: boolean = false;
  let hasCreationPermission: boolean = false;

  let derivationGroupFilterString: string = '';
  let externalSourceTypeFilterString: string = '';
  let externalEventTypeFilterString: string = '';

  let selectedDerivationGroup: DerivationGroup | undefined = undefined;
  let selectedDerivationGroupId: DerivationGroupId | null = null;
  let selectedDerivationGroupSources: ExternalSourceSlim[] = [];

  let selectedExternalSourceType: ExternalSourceType | undefined = undefined;
  let selectedExternalSourceTypeId: ExternalSourceTypeId | null = null;
  let selectedExternalSourceTypeDerivationGroups: DerivationGroup[] = [];
  let selectedExternalSourceTypeAttributeSchema: Record<string, ValueSchema>;
  let selectedExternalSourceTypeParametersMap: ParametersMap = {};

  let selectedExternalEventType: ExternalEventType | undefined = undefined;
  let selectedExternalEventTypeId: ExternalEventTypeId | null = null;
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
            hasDeletePermission: hasDeleteDerivationGroupPermissionOnRow(user, params.data),
            rowData: params.data,
          },
          target: actionsDiv,
        });
        return actionsDiv;
      },
      cellRendererParams: {
        deleteDerivationGroup,
      } as CellRendererParams,
      headerName: '',
      resizable: true,
      sortable: false,
      width: 80,
    },
  ];

  $: externalSourceTypeColumnDefs = [
    ...externalSourceTypeBaseColumnDefs,
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
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteExternalSourceType,
      } as CellRendererParams,
      headerName: '',
      resizable: true,
      sortable: false,
      width: 60,
    },
  ];

  $: externalEventTypeColumnDefs = [
    ...externalEventTypeBaseColumnDefs,
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
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteExternalEventType,
      } as CellRendererParams,
      headerName: '',
      resizable: true,
      sortable: false,
      width: 60,
    },
  ];

  function selectDerivationGroup(derivationGroup: DerivationGroup) {
    selectedDerivationGroup = derivationGroup;
    selectedExternalSourceType = undefined;
    selectedExternalEventType = undefined;
    selectedExternalSourceTypeId = null;
    selectedExternalEventTypeId = null;
  }

  function selectExternalSourceType(externalSourceType: ExternalSourceType) {
    selectedDerivationGroup = undefined;
    selectedExternalSourceType = externalSourceType;
    selectedExternalEventType = undefined;
    selectedDerivationGroupId = null;
    selectedExternalEventTypeId = null;
  }

  function selectExternalEventType(externalEventType: ExternalEventType) {
    selectedDerivationGroup = undefined;
    selectedExternalSourceType = undefined;
    selectedExternalEventType = externalEventType;
    selectedDerivationGroupId = null;
    selectedExternalSourceTypeId = null;
  }

  function deleteDerivationGroup(derivationGroup: DerivationGroup) {
    // Makes sure all associated sources are deleted before this. List of sources already contained in DerivationGroup type.
    onDeleteDerivationGroup([derivationGroup]);
  }

  function onDeleteDerivationGroup(derivationGroups: DerivationGroup[] | null | undefined) {
    if (derivationGroups !== null && derivationGroups !== undefined) {
      effects.deleteDerivationGroup(derivationGroups, user);
    }
  }

  function deleteExternalSourceType(sourceType: ExternalSourceType) {
    // Makes sure all associated derivation groups are deleted before this
    onDeleteExternalSourceType([sourceType]);
  }

  function onDeleteExternalSourceType(sourceTypes: ExternalSourceType[] | null | undefined) {
    if (sourceTypes !== null && sourceTypes !== undefined) {
      effects.deleteExternalSourceType(
        sourceTypes.map(sourceType => sourceType.name),
        $externalSources,
        user,
      );
    }
  }

  function deleteExternalEventType(eventType: ExternalEventType) {
    // Makes sure all associated sources (and therefore events, as orphans are not possible) are deleted before this
    // NOTE: does not update in derivation_group_comp after removing a EE type; derivation_group_comp defaults to 0 event types after its last external source removed,
    //        as it has no awareness of external source type or paired events (as the latter don't even exist).
    onDeleteExternalEventType([eventType]);
  }

  function onDeleteExternalEventType(eventTypes: ExternalEventType[] | null | undefined) {
    if (eventTypes !== null && eventTypes !== undefined) {
      const associatedItems = eventTypes.filter(
        eventType => $sourcesUsingExternalEventTypes.filter(entry => entry.types.includes(eventType.name)).length !== 0,
      );
      effects.deleteExternalEventType(
        eventTypes.map(eventType => eventType.name),
        associatedItems,
        user,
      );
    }
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

  function hasDeleteDerivationGroupPermissionOnRow(
    user: User | null,
    derivationGroup: DerivationGroup | undefined | null,
  ) {
    if (derivationGroup === undefined || derivationGroup === null) {
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
        const combinedSchema = await parseJSONStream<ExternalSourceEventTypeSchema>(file.stream());
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
      if (!parsedExternalSourceEventTypeSchema.event_types && !parsedExternalSourceEventTypeSchema.source_types) {
        parsedExternalSourceEventTypeSchema = undefined;
        throw new Error('External Source & Event Type Schema has Invalid Format');
      }
    } catch (error) {
      createExternalSourceEventTypeError.set((error as Error).message);
    }
  }
</script>

<CssGrid class="type-manager-grid" columns={columnSize} minHeight="100%">
  <Panel borderRight borderTop padBody={true}>
    <svelte:fragment slot="header">
      {#if selectedDerivationGroup === undefined && selectedExternalSourceType === undefined && selectedExternalEventType === undefined}
        <SectionTitle overflow="hidden">Upload Type Definition</SectionTitle>
      {:else if selectedDerivationGroup !== undefined}
        <SectionTitle overflow="hidden">
          <ExternalSourceIcon slot="icon" />Sources in '{selectedDerivationGroup.name}'
        </SectionTitle>
        <button
          class="st-button icon fs-6 deselect"
          use:tooltip={{ content: 'Deselect Derivation Group', placement: 'top' }}
          on:click|stopPropagation={() => {
            selectedDerivationGroup = undefined;
            selectedDerivationGroupId = null;
          }}
        >
          <XIcon />
        </button>
      {:else if selectedExternalSourceType !== undefined}
        <SectionTitle overflow="hidden">
          <ExternalSourceIcon slot="icon" />'{selectedExternalSourceType.name}' Details
        </SectionTitle>
        <button
          class="st-button icon fs-6 deselect"
          use:tooltip={{ content: 'Deselect External Source Type', placement: 'top' }}
          on:click|stopPropagation={() => {
            selectedExternalSourceType = undefined;
            selectedExternalSourceTypeId = null;
          }}
        >
          <XIcon />
        </button>
      {:else if selectedExternalEventType !== undefined}
        <SectionTitle overflow="hidden">
          <ExternalSourceIcon slot="icon" />'{selectedExternalEventType.name}' Details
        </SectionTitle>
        <button
          class="st-button icon fs-6 deselect"
          use:tooltip={{ content: 'Deselect External Event Type', placement: 'top' }}
          on:click|stopPropagation={() => {
            selectedExternalEventType = undefined;
            selectedExternalEventTypeId = null;
          }}
        >
          <XIcon />
        </button>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="body">
      {#if selectedDerivationGroup === undefined && selectedExternalSourceType === undefined && selectedExternalEventType === undefined}
        <div>
          <div class="type-creation-input">
            <label for="file">Type JSON Schema File</label>
            <input
              bind:this={fileInput}
              class="upload w-full"
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
            <div class="parse-status-container">
              {#if parsedExternalSourceEventTypeSchema !== undefined}
                <div class="parse-status st-typography-body">
                  <div class="check icon">
                    <CheckIcon />
                  </div>
                  Source & Event Type Attribute Schema Parsed
                </div>
              {:else}
                <div class="parse-status st-typography-body">
                  <div class="red-icon icon">
                    <WarningIcon />
                  </div>
                  <div class="status-text st-typography-body">
                    Source & Event Type Attribute Schema Could Not Be Parsed
                  </div>
                </div>
              {/if}
            </div>
          {/if}
          {#if parsedExternalSourceEventTypeSchema !== undefined}
            <div class="to-be-created st-typography-body">
              <div class="to-be-created-header">The following External Source Type(s) will be created</div>
              {#if parsedExternalSourceEventTypeSchema.source_types}
                <ul>
                  {#each Object.keys(parsedExternalSourceEventTypeSchema.source_types) as newSourceTypeName}
                    <li class="st-typograph-body">{newSourceTypeName}</li>
                  {/each}
                </ul>
              {/if}
              <div class="to-be-created-header">The following External Event Type(s) will be created</div>
              {#if parsedExternalSourceEventTypeSchema.event_types}
                <ul>
                  {#each Object.keys(parsedExternalSourceEventTypeSchema.event_types) as newEventTypeName}
                    <li class="st-typograph-body">{newEventTypeName}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
          <div class="errors">
            {#each uploadResponseErrors as currentError}
              <AlertError class="m-2" error={currentError} />
            {/each}
            <AlertError class="m-2" error={$createExternalSourceEventTypeError} />
          </div>
        </div>
      {:else if selectedDerivationGroup !== undefined}
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
      {:else if selectedExternalSourceType !== undefined}
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
              <div class="st-typography-bold">
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
          {#if Object.keys(selectedExternalSourceTypeParametersMap).length === 0}
            <div class="st-typography-label">No Attributes Defined</div>
          {:else}
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
          {/if}
        </Collapse>
        <Collapse
          title="Attribute Schema - Properties"
          tooltipContent={`${selectedExternalSourceType.name} Attribute Schema Properties`}
          defaultExpanded={false}
        >
          {#if Object.keys(selectedExternalSourceTypeParametersMap).length === 0}
            <div class="st-typography-label">No Attributes Found</div>
          {:else}
            <div class="st-typography-body">
              <Parameters
                disabled={true}
                expanded={false}
                formParameters={getFormParameters(
                  selectedExternalSourceTypeParametersMap,
                  {},
                  [],
                  undefined,
                  undefined,
                  [],
                  'option',
                  true,
                )}
              />
            </div>
          {/if}
        </Collapse>
      {:else if selectedExternalEventType !== undefined}
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
          {#if Object.keys(selectedExternalEventTypeParametersMap).length === 0}
            <div class="st-typography-label">No Attributes Found</div>
          {:else}
            <div class="st-typography-body">
              <Parameters
                disabled={true}
                expanded={false}
                formParameters={getFormParameters(
                  selectedExternalEventTypeParametersMap,
                  {},
                  [],
                  undefined,
                  undefined,
                  [],
                  'option',
                  true,
                )}
              />
            </div>
          {/if}
        </Collapse>
      {/if}
    </svelte:fragment>
  </Panel>
  <CssGridGutter track={1} type="column" />
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
          <BulkActionDataGrid
            columnDefs={derivationGroupColumnsDef}
            hasDeletePermission={hasDeleteDerivationGroupPermissionOnRow}
            singleItemDisplayText="Derivation Group"
            pluralItemDisplayText="Derivation Groups"
            filterExpression={derivationGroupFilterString}
            items={$derivationGroups}
            {user}
            getRowId={getDerivationGroupRowId}
            on:rowClicked={({ detail }) => selectDerivationGroup(detail.data)}
            on:bulkDeleteItems={({ detail }) => onDeleteDerivationGroup(detail)}
            bind:selectedItemId={selectedDerivationGroupId}
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
          <BulkActionDataGrid
            columnDefs={externalSourceTypeColumnDefs}
            hasDeletePermission={hasDeleteExternalSourceTypePermission}
            singleItemDisplayText="External Source Type"
            pluralItemDisplayText="External Source Types"
            filterExpression={externalSourceTypeFilterString}
            items={$externalSourceTypeAssociations}
            {user}
            getRowId={getExternalSourceTypeRowId}
            on:rowClicked={({ detail }) => selectExternalSourceType(detail.data)}
            on:bulkDeleteItems={({ detail }) => onDeleteExternalSourceType(detail)}
            bind:selectedItemId={selectedExternalSourceTypeId}
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
          <BulkActionDataGrid
            columnDefs={externalEventTypeColumnDefs}
            hasDeletePermission={hasDeleteExternalEventTypePermission}
            singleItemDisplayText="External Event Type"
            pluralItemDisplayText="External Event Types"
            filterExpression={externalEventTypeFilterString}
            items={$externalEventTypeAssociations}
            {user}
            getRowId={getExternalEventTypeRowId}
            on:rowClicked={({ detail }) => selectExternalEventType(detail.data)}
            on:bulkDeleteItems={({ detail }) => onDeleteExternalEventType(detail)}
            bind:selectedItemId={selectedExternalEventTypeId}
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
    width: 100%;
  }

  .attribute-value {
    color: var(--st-gray-60);
    font-style: italic;
  }

  .attribute-array {
    margin-bottom: 0;
    margin-top: 0;
  }

  .attributes {
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

  .parse-status-container {
    display: flex;
  }

  .parse-status {
    display: flex;
    margin-top: 12px;
  }

  .parse-status .check {
    background-color: #0eaf0a;
    border-radius: 50%;
    color: var(--st-white);
  }

  .parse-status .icon {
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
