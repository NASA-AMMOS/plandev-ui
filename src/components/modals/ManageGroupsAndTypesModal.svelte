<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import ExternalSourceIcon from '../../assets/external-source-box.svg?component';
  import { derivationGroups, externalSources } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExternalEventType } from '../../types/external-event';
  import type { DerivationGroup, ExternalSourceSlim, ExternalSourceType } from '../../types/external-source';
  import { showDeleteDerivationGroupModal, showDeleteExternalEventSourceTypeModal } from '../../utilities/modal';
  import { featurePermissions } from '../../utilities/permissions';
  import Collapse from '../Collapse.svelte';
  import ExternalEventTypeManagementTab from '../external-events/ExternalEventTypeManagementTab.svelte';
  import DerivationGroupManagementTab from '../external-source/DerivationGroupManagementTab.svelte';
  import ExternalSourceTypeManagementTab from '../external-source/ExternalSourceTypeManagementTab.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;

  type CellRendererParams = {
    deleteDerivationGroup: (derivationGroup: DerivationGroup) => Promise<void>;
    deleteExternalEventType: (eventType: ExternalEventType) => Promise<void>;
    deleteExternalSourceType: (sourceType: ExternalSourceType) => Promise<void>;
    viewDerivationGroup: (derivationGroup: DerivationGroup) => void;
    viewExternalEventType: (eventType: ExternalEventType) => void;
    viewExternalSourceType: (sourceType: ExternalSourceType) => void;
  };
  type ModalCellRendererParams = ICellRendererParams<DerivationGroup> & CellRendererParams;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  const modalColumnSizeNoDetail: string = '1fr 3px 0fr';
  const modalColumnSizeWithDetailDerivationGroup: string = '3fr 3px 1.3fr';
  const modalColumnSizeWithDetailExternalSourceType: string = '2fr 3px 1.2fr';

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
      headerName: 'Source type',
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

  let hasDeleteExternalSourceTypePermission: boolean = false;
  let hasDeleteExternalEventTypePermission: boolean = false;

  let modalColumnSize: string = modalColumnSizeNoDetail;

  let filterString: string = '';

  let selectedDerivationGroup: DerivationGroup | undefined = undefined;
  let selectedDerivationGroupSources: ExternalSourceSlim[] = [];

  let selectedExternalSourceType: ExternalSourceType | undefined = undefined;
  let selectedExternalSourceTypeDerivationGroups: DerivationGroup[] = [];

  $: hasDeleteExternalSourceTypePermission = featurePermissions.externalSourceType.canDelete(user);
  $: hasDeleteExternalEventTypePermission = featurePermissions.externalEventType.canDelete(user);

  $: selectedDerivationGroupSources = $externalSources.filter(
    source => selectedDerivationGroup?.name === source.derivation_group_name,
  );

  $: selectedExternalSourceTypeDerivationGroups = $derivationGroups.filter(derivationGroup => {
    if (selectedExternalSourceType !== undefined) {
      return derivationGroup.source_type_name === selectedExternalSourceType.name;
    } else {
      return false;
    }
  });

  $: derivationGroupColumnsDef = [
    ...derivationGroupBaseColumnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ModalCellRendererParams) => {
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
      cellRenderer: (params: ModalCellRendererParams) => {
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
      cellClass: 'action-cell-container',
      cellRenderer: (params: ModalCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteExternalEventType,
            deleteTooltip: {
              content: 'Delete External Source',
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
    // makes sure all associated derivation groups are deleted before this
    showDeleteExternalEventSourceTypeModal(
      sourceType,
      'External Source Type',
      [], // Currently set to an empty array due to issues with performance when looking up event types being used
      user,
    );
  }

  function deleteExternalEventType(eventType: ExternalEventType) {
    // makes sure all associated sources (and therefore events, as orphans are not possible) are deleted before this
    // NOTE: does not update in derivation_group_comp after removing a EE type; derivation_group_comp defaults to 0 event types after its last external source removed,
    //        as it has no awareness of external source type or paired events (as the latter don't even exist).
    // NOTE: The 'associatedItems' argument is currently set to [] as pulling event types with derivation groups had performance issues - currently the user will not be warned that their type still has implementations, but the deletion will not succeed.
    showDeleteExternalEventSourceTypeModal(eventType, 'External Event Type', [], user);
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
      modalColumnSize = modalColumnSizeWithDetailDerivationGroup;
    } else {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = undefined;
      modalColumnSize = modalColumnSizeNoDetail;
    }
  }

  function viewExternalSourceType(sourceType: ExternalSourceType) {
    if (selectedExternalSourceType === undefined || selectedExternalSourceType !== sourceType) {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = sourceType;
      modalColumnSize = modalColumnSizeWithDetailExternalSourceType;
    } else {
      selectedDerivationGroup = undefined;
      selectedExternalSourceType = undefined;
      modalColumnSize = modalColumnSizeNoDetail;
    }
  }

  function hasDeleteDerivationGroupPermissionOnRow(derivationGroup: DerivationGroup | undefined) {
    if (derivationGroup === undefined) {
      return false;
    } else {
      return featurePermissions.derivationGroup.canDelete(user, derivationGroup);
    }
  }
</script>

<Modal height={700} width={1000}>
  <ModalHeader on:close>Manage Derivation Groups and Types</ModalHeader>
  <ModalContent style="overflow: hidden;">
    <CssGrid class="modal-grid" columns={modalColumnSize} minHeight="100%">
      <div class="derivation-groups-modal-filter-container">
        <div class="derivation-groups-modal-content">
          <Tabs class="management-tabs" tabListClassName="management-tabs-list">
            <svelte:fragment slot="tab-list">
              <Tab class="management-tab">Derivation Group</Tab>
              <Tab class="management-tab">External Source Type</Tab>
              <Tab class="management-tab">External Event Type</Tab>
            </svelte:fragment>
            <TabPanel>
              <DerivationGroupManagementTab {derivationGroupColumnsDef} {filterString} />
            </TabPanel>
            <TabPanel>
              <ExternalSourceTypeManagementTab {externalSourceTypeColumnDefs} {filterString} />
            </TabPanel>
            <TabPanel>
              <ExternalEventTypeManagementTab {externalEventTypeColumnDefs} {filterString} />
            </TabPanel>
          </Tabs>
        </div>
      </div>
      {#if selectedDerivationGroup !== undefined}
        <CssGridGutter track={1} type="column" />
        <Panel borderRight padBody={true}>
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
      {:else if selectedExternalSourceType !== undefined}
        <CssGridGutter track={1} type="column" />
        <Panel borderRight padBody={true}>
          <svelte:fragment slot="header">
            <SectionTitle overflow="hidden">
              <ExternalSourceIcon slot="icon" />Derivation Groups of Type '{selectedExternalSourceType.name}'
            </SectionTitle>
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
          </svelte:fragment>
        </Panel>
      {/if}
    </CssGrid>
  </ModalContent>
  <ModalFooter>
    <div class="filter">
      <input
        bind:value={filterString}
        autocomplete="off"
        class="st-input w-full"
        name="filter-ee"
        placeholder={`Filter ...`}
      />
    </div>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>

<style>
  .derivation-groups-modal-content :global(.tab-list.management-tabs-list) {
    background-color: var(--st-gray-10);
  }

  .derivation-groups-modal-content :global(button.management-tab) {
    align-items: center;
    gap: 8px;
    text-align: center;
    width: 33%;
  }

  .derivation-groups-modal-content :global(button.management-tab:last-of-type) {
    flex: 1;
  }
  .derivation-groups-modal-content :global(button.management-tab:last-of-type.selected) {
    box-shadow: 1px 0px 0px inset var(--st-gray-20);
  }

  .derivation-groups-modal-content :global(button.management-tab:first-of-type.selected) {
    box-shadow: -1px 0px 0px inset var(--st-gray-20);
  }

  .derivation-groups-modal-content :global(button.management-tab:not(.selected)) {
    box-shadow: 0px -1px 0px inset var(--st-gray-20);
  }

  .derivation-groups-modal-content :global(button.management-tab.selected) {
    background-color: var(--st-gray-20);
    box-shadow:
      1px 0px 0px inset var(--st-gray-20),
      -1px 0px 0px inset var(--st-gray-20);
  }

  .derivation-groups-modal-filter-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: 100%;
    justify-content: flex-end;
    padding-right: 8px;
    width: 100%;
  }

  .derived-event-count {
    color: var(--st-gray-60);
  }

  .derivation-groups-modal-content {
    height: 100%;
  }

  .filter {
    align-items: center;
    display: inline-flex;
    flex-direction: row;
    justify-self: center;
    width: 100%;
  }

  :global(.modal-grid) {
    height: 100%;
  }
</style>
