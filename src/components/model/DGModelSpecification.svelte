<svelte:options immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type { CellEditingStoppedEvent, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import { derivationGroups, externalSources } from '../../stores/external-source';
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { DerivationGroup, ExternalSourceSlim } from '../../types/external-source';
  import { getDerivationGroupRowId } from '../../utilities/externalEvents';
  import { featurePermissions } from '../../utilities/permissions';
  import { formatDate } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;
  export let selectedDerivationGroups: string[];

  $: console.log('dgmodelspec -> selectedDerivationGroups', selectedDerivationGroups);

  type CellRendererParams = {
    viewDerivationGroup: (derivationGroup: DerivationGroup) => void;
  };
  type DerivationGroupCellRendererParams = ICellRendererParams<DerivationGroup> & CellRendererParams;

  const derivationGroupBaseColumnDefs: DataGridColumnDef<DerivationGroup>[] = [
    {
      field: 'name',
      filter: 'string',
      headerName: 'Derivation Group',
      resizable: true,
      sortable: true,
      suppressAutoSize: false,
      suppressSizeToFit: false,
    },
    {
      field: 'source_type_name',
      filter: 'string',
      headerName: 'Source type',
      resizable: true,
      sortable: true,
      suppressAutoSize: false,
      suppressSizeToFit: false,
    },
    {
      field: 'owner',
      filter: 'string',
      headerName: 'Owner',
      resizable: true,
      sortable: true,
    },
    {
      field: 'derived_event_total',
      filter: 'number',
      headerName: 'Derived Events in Derivation Group',
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueFormatter: params => {
        return params?.value.length;
      },
      width: 250,
    },
  ];

  let dataGrid: DataGrid<DerivationGroup>;
  let derivationGroupColumnDefs: DataGridColumnDef<DerivationGroup>[] = derivationGroupBaseColumnDefs;

  let filterText: string = '';
  let filteredDerivationGroups: DerivationGroup[] = [];

  let selectedDerivationGroup: DerivationGroup | undefined = undefined;
  let selectedDerivationGroupSources: ExternalSourceSlim[] = [];

  let hasUpdateDerivationGroupLinkPermission: boolean = false;

  $: hasUpdateDerivationGroupLinkPermission =
    featurePermissions.derivationGroupModelLink.canCreate(user) &&
    featurePermissions.derivationGroupModelLink.canDelete(user);

  // $: selectedDerivationGroups = $selectedModelDerivationGroupNames.reduce(
  //   (prevBooleanMap: Record<string, boolean>, derivationGroupName: string) => {
  //     return {
  //       ...prevBooleanMap,
  //       [derivationGroupName]: true,
  //     };
  //   },
  //   {},
  // );

  $: if (selectedDerivationGroups && dataGrid) {
    dataGrid.refreshCells({ columns: ['selected'] });
  }

  $: selectedDerivationGroupSources = $externalSources.filter(
    source => selectedDerivationGroup?.name === source.derivation_group_name,
  );

  $: filteredDerivationGroups = $derivationGroups.filter(derivationGroup => {
    const filterTextLowerCase = filterText.toLowerCase();
    const includesName = derivationGroup.name.toLocaleLowerCase().includes(filterTextLowerCase);
    return includesName;
  });

  $: derivationGroupColumnDefs = [
    ...derivationGroupBaseColumnDefs,
    {
      cellDataType: 'boolean',
      colId: 'selected',
      editable: hasUpdateDerivationGroupLinkPermission,
      headerName: 'Included in Model',
      resizable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: (params: ValueGetterParams<DerivationGroup>) => {
        const { data } = params;
        if (data) {
          return selectedDerivationGroups.includes(data.name);
        }
        return false;
      },
      width: 115,
    },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: DerivationGroupCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
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
        viewDerivationGroup,
      } as CellRendererParams,
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 40,
    },
  ];

  $: if (selectedDerivationGroups) {
    dataGrid?.redrawRows();
  }

  function viewDerivationGroup(viewedDerivationGroup: DerivationGroup) {
    const derivationGroup = $derivationGroups.find(
      derivationGroup => derivationGroup.name === viewedDerivationGroup.name,
    );
    if (derivationGroup === selectedDerivationGroup) {
      selectedDerivationGroup = undefined;
    } else {
      selectedDerivationGroup = derivationGroup;
    }
  }

  function onToggleDerivationGroup(event: CustomEvent<CellEditingStoppedEvent<DerivationGroup, boolean>>) {
    const {
      detail: { data, newValue },
    } = event;

    if (data && newValue !== null && newValue !== undefined) {
      if (newValue && !selectedDerivationGroups.includes(data.name)) {
        selectedDerivationGroups = [...selectedDerivationGroups, data.name];
      } else if (!newValue && selectedDerivationGroups.includes(data.name)) {
        selectedDerivationGroups = selectedDerivationGroups.filter(dg => dg !== data.name);
      }
    }
  }
</script>

<div class="metadata-container">
  <div class="metadata-filter-container">
    <CssGrid columns="1fr 3px 1fr" minHeight="100%">
      <div class="derivation-groups-modal-container">
        <div class="derivation-groups-modal-filter-container">
          <Input layout="inline">
            <input bind:value={filterText} class="st-input" placeholder="Filter derivation groups" />
          </Input>
          <button
            class="st-button secondary ellipsis new-external-source-button"
            name="new-external-source"
            on:click={() => window.open(`${base}/external-sources`)}
          >
            Upload
          </button>
        </div>
        <hr />
        <div class="derivation-groups-modal-table-container">
          <DataGrid
            bind:this={dataGrid}
            columnDefs={derivationGroupColumnDefs}
            noRowsOverlayText="No Derivation Groups Found"
            rowData={filteredDerivationGroups}
            getRowId={getDerivationGroupRowId}
            on:cellEditingStopped={onToggleDerivationGroup}
          />
        </div>
      </div>
      {#if selectedDerivationGroup !== undefined}
        <CssGridGutter track={1} type="column" />
        <Panel borderRight padBody={true} overflowYBody="scroll">
          <svelte:fragment slot="header">
            <SectionTitle overflow="hidden">
              <ExternalSourceIcon slot="icon" />Sources in '{selectedDerivationGroup.name}'
            </SectionTitle>
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
                    {formatDate(new Date(source.start_time), $plugins.time.primary.format)}
                  </div>

                  <div class="st-typography-body">
                    <div class="st-typography-bold">End Time:</div>
                    {formatDate(new Date(source.end_time), $plugins.time.primary.format)}
                  </div>

                  <div class="st-typography-body">
                    <div class="st-typography-bold">Valid At:</div>
                    {formatDate(new Date(source.valid_at), $plugins.time.primary.format)}
                  </div>

                  <div class="st-typography-body">
                    <div class="st-typography-bold">Created At:</div>
                    {formatDate(new Date(source.created_at), $plugins.time.primary.format)}
                  </div>
                </Collapse>
              {/each}
            {:else}
              <p class="st-typography-body">No sources in this group.</p>
            {/if}
          </svelte:fragment>
        </Panel>
      {/if}
    </CssGrid>
  </div>
</div>

<style>
  .derivation-groups-modal-container {
    display: grid;
    grid-template-rows: min-content min-content auto;
    height: 100%;
    height: 100%;
    row-gap: 0.5rem;
  }

  .derivation-groups-modal-container hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0 1rem;
    width: auto;
  }

  .derivation-groups-modal-filter-container {
    align-items: center;
    column-gap: 0.25rem;
    display: flex;
    grid-template-columns: min-content auto min-content;
    margin: 0.5rem 1rem 0;
  }

  .derivation-groups-modal-table-container {
    height: 400px;
    padding: 0 1rem 0.5rem;
    width: 900px;
  }

  .derived-event-count {
    color: var(--st-gray-60);
  }

  .new-external-source-button {
    align-items: center;
    display: flex;
    width: 100px;
  }

  .metadata-container {
    display: grid;
    grid-template-rows: min-content min-content auto;
    row-gap: 0.5rem;
  }

  .metadata-container hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0 1rem;
    width: auto;
  }

  .metadata-filter-container {
    align-items: center;
    column-gap: 0.25rem;
    display: grid;
    grid-template-columns: min-content auto min-content;
    margin: 0.5rem 1rem 0;
  }
</style>
