<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar } from '@nasa-jpl/stellar-svelte';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import type { ColDef, IRowNode, ValueGetterParams } from 'ag-grid-community';
  import { Check, Search } from 'lucide-svelte';
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
      field: 'id',
      headerName: 'ID',
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    {
      field: 'name',
      headerName: 'Name',
    },
    {
      field: 'version',
      headerName: 'Version',
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 70,
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
      width: 150,
    },
  ];

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: ModelSlim;
  }>();

  let modifiedDirectivesTypes: Record<string, ActivityDirective[]> = {};
  let modifiedDirectivesCount: number = 0;
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
    gql.SUB_PLAN_MERGE_REQUESTS_INCOMING,
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
      modifiedDirectivesTypes = {};
      removedDirectivesTypes = {};
      modifiedDirectivesCount = 0;
      removedDirectiveCount = 0;
      loadingCompatibility = true;
      migrationCompatibility = await effects.checkMigrationCompatability(plan.id, missionModel.id, user);
      loadingCompatibility = false;
      if (migrationCompatibility) {
        migrationCompatibility.impacted_directives.forEach(({ issue, activity_directive }) => {
          if (issue === 'altered') {
            if (!modifiedDirectivesTypes[activity_directive.type]) {
              modifiedDirectivesTypes[activity_directive.type] = [];
            }
            modifiedDirectivesTypes[activity_directive.type].push(activity_directive);
            modifiedDirectivesCount++;
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
  <div class="flex h-full flex-1 flex-col overflow-hidden p-4">
    {#if $planMergeRequestsIncoming !== null && $planMergeRequestsIncoming.length}
      <AlertError
        error="Cannot change model while plan has incoming merge requests"
        fullError="All incoming merge requests for this plan must be resolved before model migration can be performed"
        class="mb-3"
      />
    {/if}
    <Input>
      <div class="opacity-50" slot="left">
        <Search size={16} />
      </div>
      <InputStellar
        autocomplete="off"
        name=""
        class="w-full"
        placeholder="Search mission models"
        aria-label="Search mission models"
        on:input={onFiltering}
        sizeVariant="sm"
      />
    </Input>
    <CssGrid columns="40% 2px 60%" class="flex flex-1 overflow-hidden">
      <div class="flex-col gap-2 overflow-auto pb-0 pl-0 pr-2 pt-2">
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
      <div class="flex-col gap-2 overflow-auto p-4">
        {#if selectedMissionModel === null}
          <div class="text-muted-foreground">Select mission model for expected incompatibilities...</div>
        {:else if loadingCompatibility}
          <Loading />
        {:else}
          <div>
            <div class="mb-2 text-base">Expected Incompatibilities</div>
            {#if !migrationCompatibility}
              <div class="mb-3 flex gap-1 text-red-500">Unable to compute expected incompatibilities</div>
            {:else if migrationCompatibility?.impacted_directives.length < 1}
              <div class="mb-3 flex gap-1">
                <Check class="text-green-600" size={16} /> No expected incompatibilities
              </div>
            {:else}
              <div>
                <div class="mb-3 flex gap-1">
                  <WarningIcon class="text-red-500" />
                  {migrationCompatibility.impacted_directives.length} incompatible activity directive{pluralize(
                    migrationCompatibility.impacted_directives.length,
                  )}
                </div>
                {#if Object.keys(modifiedDirectivesTypes).length > 0}
                  <Collapse>
                    <div slot="title" class="flex gap-2">
                      {Object.keys(modifiedDirectivesTypes).length} Modified Activity Type{pluralize(
                        Object.keys(modifiedDirectivesTypes).length,
                      )}
                      <div
                        use:tooltip={{
                          content: `${modifiedDirectivesCount} affected activity directive${pluralize(modifiedDirectivesCount)} in plan`,
                        }}
                        class="flex items-center gap-0.5 opacity-60"
                      >
                        <DirectiveIcon />
                        {modifiedDirectivesCount}
                      </div>
                    </div>
                    {#each Object.keys(modifiedDirectivesTypes).sort() as type}
                      <Collapse defaultExpanded={false} className="[&_button]:!h-6">
                        <div slot="title" class="flex gap-2">
                          {type}
                          <div
                            use:tooltip={{
                              content: `${modifiedDirectivesTypes[type].length} affected activity directive${pluralize(modifiedDirectivesTypes[type].length)} in plan`,
                            }}
                            class="flex items-center gap-0.5 opacity-60"
                          >
                            <DirectiveIcon />
                            {modifiedDirectivesTypes[type].length}
                          </div>
                        </div>
                        <CssGrid columns="50% 50%" gap="8px">
                          <div class="flex flex-grow flex-col overflow-hidden">
                            <div class="mb-1 text-muted-foreground">
                              Old Parameter Schema ({$models.find(m => m.id === plan.model_id)?.name ??
                                'Unknown Model'})
                            </div>
                            <div class="overflow-auto rounded bg-accent p-2 font-mono">
                              <pre>{JSON.stringify(
                                  migrationCompatibility.modified_activity_types[type].old_parameter_schema,
                                  undefined,
                                  2,
                                )}</pre>
                            </div>
                          </div>
                          <div class="flex flex-grow flex-col overflow-hidden">
                            <div class="mb-1 text-muted-foreground">
                              New Parameter Schema ({selectedMissionModel.name})
                            </div>
                            <div class="overflow-auto rounded bg-accent p-2 font-mono">
                              <pre>{JSON.stringify(
                                  migrationCompatibility.modified_activity_types[type].new_parameter_schema,
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
                    <div slot="title" class="flex gap-2">
                      {Object.keys(removedDirectivesTypes).length} Removed Activity Type{pluralize(
                        Object.keys(removedDirectivesTypes).length,
                      )}
                      <div
                        use:tooltip={{
                          content: `${removedDirectiveCount} affected activity directive${pluralize(removedDirectiveCount)} in plan`,
                        }}
                        class="flex items-center gap-0.5 opacity-60"
                      >
                        <DirectiveIcon />
                        {removedDirectiveCount}
                      </div>
                    </div>
                    {#each Object.keys(removedDirectivesTypes).sort() as type}
                      <div
                        class="flex cursor-default justify-start gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-left font-medium leading-6 text-black"
                      >
                        {type}
                        <div
                          use:tooltip={{
                            content: `${removedDirectivesTypes[type].length} affected activity directive${pluralize(removedDirectivesTypes[type].length)} in plan`,
                          }}
                          class="flex items-center gap-0.5 opacity-60"
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
    <div class="text-muted">Snapshot will be automatically created</div>
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
