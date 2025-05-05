<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import type { ColDef, IRowNode, ValueGetterParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import DirectiveIcon from '../../assets/timeline-directive.svg?component';
  import { models } from '../../stores/model';
  import { gqlSubscribable } from '../../stores/subscribable';
  import type { ActivityDirective } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridRowSelection, RowId } from '../../types/data-grid';
  import type { Model, ModelSlim } from '../../types/model';
  import type { ModelCompatabilityForPlan, PlanMergeRequestSchema, PlanSlim } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import gql from '../../utilities/gql';
  import { getActivePlanMergeRequests } from '../../utilities/plan';
  import { pluralize } from '../../utilities/text';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import Loading from '../Loading.svelte';
  import AlertError from '../ui/AlertError.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Modal from './Modal.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let plan: PlanSlim;
  export let user: User | null = null;

  const height: string = '80vh';
  const width: string = '80vw';
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
      width: 120,
    },
  ];

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: ModelSlim;
  }>();

  let alteredDirectivesTypes: Record<string, ActivityDirective[]> = {};
  let alteredDirectivesCount: number = 0;
  let filterExpression: string = '';
  let isRowSelectable: ((node: IRowNode) => boolean) | undefined = undefined;
  let loadingCompatibility: boolean = false;
  let migrationCompatibility: ModelCompatabilityForPlan | undefined = undefined;
  let otherModels: ModelSlim[] = [];
  let removedDirectivesTypes: Record<string, ActivityDirective[]> = {};
  let removedDirectiveCount: number = 0;
  let selectedItemId: RowId | null = null;
  let selectedMissionModel: ModelSlim | null = null;

  $: planMergeRequestsIncoming = gqlSubscribable<PlanMergeRequestSchema[] | null>(
    gql.SUB_PLAN_MERGE_REQUEST_IDS_INCOMING,
    { planId: plan.id },
    null,
    null,
    incoming => getActivePlanMergeRequests(incoming),
  );
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
      alteredDirectivesTypes = {};
      removedDirectivesTypes = {};
      alteredDirectivesCount = 0;
      removedDirectiveCount = 0;
      loadingCompatibility = true;
      migrationCompatibility = await effects.checkMigrationCompatability(plan.id, missionModel.id, user);
      loadingCompatibility = false;
      if (migrationCompatibility) {
        migrationCompatibility.problematic_directives.forEach(({ issue, activity_directive }) => {
          if (issue === 'altered') {
            if (!alteredDirectivesTypes[activity_directive.type]) {
              alteredDirectivesTypes[activity_directive.type] = [];
            }
            alteredDirectivesTypes[activity_directive.type].push(activity_directive);
            alteredDirectivesCount++;
          } else if (issue === 'removed') {
            if (!removedDirectivesTypes[activity_directive.type]) {
              removedDirectivesTypes[activity_directive.type] = [];
            }
            removedDirectivesTypes[activity_directive.type].push(activity_directive);
            removedDirectiveCount++;
          }
        });
      }
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
  <div class="body">
    {#if $planMergeRequestsIncoming !== null && $planMergeRequestsIncoming.length}
      <AlertError
        error="Cannot change model while plan has incoming merge requests"
        fullError="All incoming merge requests for this plan must be resolved before model migration can be performed"
        class="mb-3"
      />
    {/if}
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
    <CssGrid columns="40% 2px 60%" class="update-plan-model-grid">
      <div class="mission-model-column">
        <DataGrid
          bind:currentSelectedRowId={selectedItemId}
          {columnDefs}
          loading={!$planMergeRequestsIncoming}
          rowData={otherModels}
          rowSelection="single"
          on:rowSelected={onClickMissionModel}
          {isRowSelectable}
          {filterExpression}
        />
      </div>
      <CssGridGutter track={1} type="column" />
      <div class="model-migration-preview mission-model-column">
        {#if selectedMissionModel === null}
          <div class="st-typography-label">Select mission model for expected incompatibilities...</div>
        {:else if loadingCompatibility}
          <Loading />
        {:else}
          <div>
            <div class="st-typography-displayBody mb-2">Expected Incompatibilities</div>
            {#if !migrationCompatibility}
              <div class="st-typography-label mb-3 message">Unable to compute expected incompatibilities</div>
            {:else if migrationCompatibility?.problematic_directives.length < 1}
              <div class="st-typography-label mb-3 message"><CheckIcon /> No expected incompatibilities</div>
            {:else}
              <div class="st-typography-body">
                <div class="st-typography-body mb-3 message">
                  <WarningIcon class="red-icon" />
                  {migrationCompatibility.problematic_directives.length} incompatible activity directive{pluralize(
                    migrationCompatibility.problematic_directives.length,
                  )}
                </div>
                {#if Object.keys(alteredDirectivesTypes).length > 0}
                  <Collapse>
                    <div slot="title" class="collapse-title">
                      {Object.keys(alteredDirectivesTypes).length} Modified Activity Type{pluralize(
                        Object.keys(alteredDirectivesTypes).length,
                      )}
                      <div
                        use:tooltip={{
                          content: `${alteredDirectivesCount} affected activity directive${pluralize(alteredDirectivesCount)} in plan`,
                        }}
                        class="directives-badge"
                      >
                        <DirectiveIcon />
                        {alteredDirectivesCount}
                      </div>
                    </div>
                    {#each Object.keys(alteredDirectivesTypes).sort() as type}
                      <Collapse defaultExpanded={false} className="parameter-schema-collapse">
                        <div slot="title" class="collapse-title">
                          {type}
                          <div
                            use:tooltip={{
                              content: `${alteredDirectivesTypes[type].length} affected activity directive${pluralize(alteredDirectivesTypes[type].length)} in plan`,
                            }}
                            class="directives-badge"
                          >
                            <DirectiveIcon />
                            {alteredDirectivesTypes[type].length}
                          </div>
                        </div>
                        <CssGrid columns="50% 50%" gap="8px">
                          <div class="parameter-schema">
                            <div class="st-typography-label mb-1">
                              Old Parameter Schema ({$models.find(m => m.id === plan.model_id)?.name ??
                                'Unknown Model'})
                            </div>
                            <div class="json">
                              <pre>{JSON.stringify(
                                  migrationCompatibility.altered_activity_types[type].old_parameter_schema,
                                  undefined,
                                  2,
                                )}</pre>
                            </div>
                          </div>
                          <div class="parameter-schema">
                            <div class="st-typography-label mb-1">
                              New Parameter Schema ({selectedMissionModel.name})
                            </div>
                            <div class="json">
                              <pre>{JSON.stringify(
                                  migrationCompatibility.altered_activity_types[type].new_parameter_schema,
                                  undefined,
                                  2,
                                )}</pre>
                            </div>
                          </div>
                        </CssGrid>
                      </Collapse>
                    {/each}
                  </Collapse>
                {/if}
                {#if Object.keys(removedDirectivesTypes).length > 0}
                  <Collapse>
                    <div slot="title" class="collapse-title">
                      {Object.keys(removedDirectivesTypes).length} Removed Activity Type{pluralize(
                        Object.keys(removedDirectivesTypes).length,
                      )}
                      <div
                        use:tooltip={{
                          content: `${removedDirectiveCount} affected activity directive${pluralize(removedDirectiveCount)} in plan`,
                        }}
                        class="directives-badge"
                      >
                        <DirectiveIcon />
                        {removedDirectiveCount}
                      </div>
                    </div>
                    {#each Object.keys(removedDirectivesTypes).sort() as type}
                      <div class="removed-type st-button tertiary">
                        {type}
                        <div
                          use:tooltip={{
                            content: `${removedDirectivesTypes[type].length} affected activity directive${pluralize(removedDirectivesTypes[type].length)} in plan`,
                          }}
                          class="directives-badge"
                        >
                          <DirectiveIcon />
                          {removedDirectivesTypes[type].length}
                        </div>
                      </div>
                    {/each}
                  </Collapse>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </CssGrid>
  </div>
  <ModalFooter>
    <div class="st-typography-label">Snapshot will be automatically created</div>
    <button class="st-button secondary" on:click={close}>Cancel</button>
    <button
      class="st-button"
      on:click={confirm}
      disabled={!selectedMissionModel || !$planMergeRequestsIncoming || $planMergeRequestsIncoming.length > 0}
    >
      Change Mission Model
    </button>
  </ModalFooter>
</Modal>

<style>
  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    padding: 1rem;
  }

  :global(.update-plan-model-grid) {
    flex: 1;
    overflow: hidden;
  }

  .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  .mission-model-column {
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    padding: 8px 8px 0 0;
  }

  .model-migration-preview {
    padding: 16px;
  }

  .model-migration-preview :global(.counts) {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }

  .message {
    display: flex;
    gap: 4px;
  }

  .json {
    background: var(--st-gray-10);
    border-radius: 4px;
    font-family: 'JetBrains mono';
    overflow: auto;
    padding: 8px;
  }

  .json pre {
    font-family: 'JetBrains mono';
    margin: 0;
  }

  .parameter-schema {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
  }

  .removed-type {
    color: var(--st-typography-medium-color);
    cursor: default;
    gap: 8px;
    justify-content: flex-start;
    line-height: 24px;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .removed-type.st-button:hover {
    background: inherit;
  }

  :global(.parameter-schema-collapse button.collapse-header) {
    height: 24px !important;
  }

  .collapse-title {
    display: flex;
    gap: 8px;
  }

  .directives-badge {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    flex-direction: row;
    gap: 2px;
  }
</style>
