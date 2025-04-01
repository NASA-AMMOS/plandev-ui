<svelte:options immutable={true} />

<script lang="ts">
  import ModalHeader from './ModalHeader.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import Input from '../form/Input.svelte';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import type { ColDef, IRowNode } from 'ag-grid-community';
  import { models } from '../../stores/model';
  import type { DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { ModelSlim } from '../../types/model';
  import { getTarget } from '../../utilities/generic';
  import type { ActivityErrorCounts } from '../../types/errors';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';
  import { createEventDispatcher } from 'svelte';
  import effects from '../../utilities/effects';
  import type { User } from '../../types/app';

  export let planId: number | null = null;
  export let user: User | null = null;

  let modelMigrationPreviewErrorCounts: ActivityErrorCounts | undefined;
  let isRowSelectable: ((node: IRowNode) => boolean) | undefined = undefined;
  let filterExpression: string = '';
  let height: number = 500;
  let selectedItemId: RowId | null = null;
  let selectedMissionModel: ModelSlim | null = null;
  let width: number = 800;
  let columnDefs: ColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
    },
    {
      field: 'created_at',
      headerName: 'Created',
      sort: 'desc',
      width: 80,
    },
  ];

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: ModelSlim;
  }>();

  function onFiltering(event: Event) {
    const { value } = getTarget(event);
    filterExpression = value as string;
  }

  function onClickMissionModel(event: CustomEvent<DataGridRowSelection<ModelSlim>>) {
    const {
      detail: { data: model, isSelected },
    } = event;
    if (isSelected) {
      selectedMissionModel = model;
      previewMissionModelMigration();
    }
  }

  async function previewMissionModelMigration() {
    if (selectedMissionModel !== null && planId !== null) {
      modelMigrationPreviewErrorCounts = await effects.checkMigrationCompatability(planId, selectedMissionModel.id, user);
    }
  }

  function close() {
    dispatch(`close`);
  }

  function confirm() {
    if (selectedMissionModel !== null) {
      dispatch(`confirm`, selectedMissionModel);
    }
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Change Mission Model</ModalHeader>
  <ModalContent>
    <div class="body">
      <Input>
        <div class="search-icon" slot="left">
          <SearchIcon />
        </div>
        <input
          autocomplete="off"
          name=""
          class="st-input w-100"
          placeholder="Search mission models"
          on:input={onFiltering}
        />
      </Input>
      <CssGrid columns="60% 2px 40%">
        <div class="mission-model-column">
          <DataGrid
            bind:currentSelectedRowId={selectedItemId}
            {columnDefs}
            rowData={$models}
            rowSelection="single"
            on:rowSelected={onClickMissionModel}
            {isRowSelectable}
            {filterExpression}
          ></DataGrid>
        </div>
        <CssGridGutter track={1} type="column" />
        <div class="model-migration-preview mission-model-column">
          {#if selectedMissionModel === null}
            <div class="st-typography-label">Select mission model for expected conflicts...</div>
          {:else}
            <div class="st-typography-label st-typography-bold">Expected conflicts</div>
            <ActivityErrorsRollup selectable={true} counts={modelMigrationPreviewErrorCounts} showTotalCount={true} />
          {/if}
        </div>
      </CssGrid>
    </div>
  </ModalContent>
  <ModalFooter>
    <div class="st-typography-label">Snapshot will be automatically created</div>
    <button class="st-button secondary" on:click={close}>Cancel</button>
    <button class="st-button" on:click={confirm}>Change Mission Model</button>
  </ModalFooter>
</Modal>

<style>
  .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  .mission-model-column {
    flex-direction: column;
    gap: 8px;
    height: 400px;
    overflow: auto;
    padding: 8px 8px 0 0;
  }

  .model-migration-preview {
    padding: 8px;
  }

  .model-migration-preview div:first-child {
    height: 20px;
  }
</style>
