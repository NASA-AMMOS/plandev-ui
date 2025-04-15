<svelte:options immutable={true} />

<script lang="ts">
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import type { ColDef, IRowNode, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { models } from '../../stores/model';
  import type { User } from '../../types/app';
  import type { DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { ActivityErrorCounts } from '../../types/errors';
  import type { Model, ModelSlim } from '../../types/model';
  import type { PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { getShortISOForDate } from '../../utilities/time';
  import Input from '../form/Input.svelte';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let plan: PlanSlim;
  export let user: User | null = null;

  const height: number = 500;
  const width: number = 1000;
  const columnDefs: ColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
    },
    {
      field: 'version',
      headerName: 'Version',
      width: 50,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      sort: 'desc',
      valueGetter: (params: ValueGetterParams<Model>): string | void => {
        if (params.data?.created_at) {
          return getShortISOForDate(new Date(params.data?.created_at));
        }
      },
      width: 100,
    },
  ];

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: ModelSlim;
  }>();

  let isRowSelectable: ((node: IRowNode) => boolean) | undefined = undefined;
  let modelMigrationPreviewErrorCounts: ActivityErrorCounts | undefined;
  let filterExpression: string = '';
  let selectedItemId: RowId | null = null;
  let selectedMissionModel: ModelSlim | null = null;

  $: previewMissionModelMigration(selectedMissionModel);
  $: otherModels = $models.filter(m => m.id !== plan.model_id);

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
    }
  }

  async function previewMissionModelMigration(missionModel: ModelSlim | null) {
    if (missionModel !== null) {
      modelMigrationPreviewErrorCounts = await effects.checkMigrationCompatability(plan.id, missionModel.id, user);
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
            rowData={otherModels}
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
            <div class="st-typography-bold">
              Expected conflicts
              {typeof modelMigrationPreviewErrorCounts?.all === 'number' && modelMigrationPreviewErrorCounts.all > 0
                ? `(${modelMigrationPreviewErrorCounts.all})`
                : ''}
            </div>
            {#if modelMigrationPreviewErrorCounts === undefined || (modelMigrationPreviewErrorCounts.all !== undefined && modelMigrationPreviewErrorCounts.all < 1)}
              <div class="st-typography-label no-conflicts">None</div>
            {:else}
              <ActivityErrorsRollup counts={modelMigrationPreviewErrorCounts} />
            {/if}
          {/if}
        </div>
      </CssGrid>
    </div>
  </ModalContent>
  <ModalFooter>
    <div class="st-typography-label">Snapshot will be automatically created</div>
    <button class="st-button secondary" on:click={close}>Cancel</button>
    <button class="st-button" on:click={confirm} disabled={!selectedMissionModel}>Change Mission Model</button>
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
    padding: 16px;
  }

  .model-migration-preview div:first-child {
    height: 20px;
  }

  .model-migration-preview :global(.counts) {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }

  .no-conflicts {
    padding-top: 12px;
  }
</style>
