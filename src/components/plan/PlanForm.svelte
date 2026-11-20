<svelte:options immutable={true} />

<script lang="ts">
  import { Button, cn } from '@nasa-jpl/stellar-svelte';
  import { FileUp, Pencil } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { field } from '../../stores/form';
  import { planReadOnlySnapshot } from '../../stores/plan';
  import {
    initialPlanSnapshotsLoading,
    planSnapshotId,
    planSnapshots,
    planSnapshotsWithSimulations,
  } from '../../stores/planSnapshots';
  import { plans } from '../../stores/plans';
  import { simulationDataset, simulationDatasetId } from '../../stores/simulation';
  import { viewTogglePanel } from '../../stores/views';
  import type { ActivityDirectivesMap } from '../../types/activity';
  import type { User, UserId } from '../../types/app';
  import type { Plan, PlanCollaborator, PlanSlimmer } from '../../types/plan';
  import type { PlanSnapshot as PlanSnapshotType } from '../../types/plan-snapshot';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { exportPlan } from '../../utilities/plan';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { removeQueryParam, setQueryParam } from '../../utilities/url';
  import { required, unique } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import AsyncContentState from '../ui/AsyncContentState.svelte';
  import CardList from '../ui/CardList.svelte';
  import FilterToggleButton from '../ui/FilterToggleButton.svelte';
  import ProgressRadial from '../ui/ProgressRadial.svelte';
  import PlanCollaboratorInput from '../ui/Tags/PlanCollaboratorInput.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import PlanSnapshot from './PlanSnapshot.svelte';
  import PlanTimeBounds from './PlanTimeBounds.svelte';

  const planSnapshotsError = planSnapshots.error;

  const dispatch = createEventDispatcher<{ modelchange: void; namechange: string }>();

  export let plan: Plan | null;
  export let isReadOnly: boolean = false;
  export let isLocked: boolean = false;
  export let importInProgress: boolean = false;
  export let mode: 'plan' | 'listing' = 'plan';
  export let activityDirectivesMap: ActivityDirectivesMap | null = {};
  export let planTags: Tag[];
  export let tags: Tag[] = [];
  export let user: User | null;
  export let users: UserId[] = [];
  export let usersLoading: boolean = false;
  export let userWriteablePlans: PlanSlimmer[] | null = null;

  let filteredPlanSnapshots: PlanSnapshotType[] = [];
  let isFilteredBySimulation: boolean = false;
  let hasCreateSnapshotPermission: boolean = false;
  let hasPlanUpdatePermission: boolean = false;
  let hasPlanCollaboratorsUpdatePermission: boolean = false;
  let hasChangePlanModelPermission: boolean = false;
  let planNameField = field<string>('', [
    required,
    unique(
      $plans.filter(p => p.id !== plan?.id).map(p => p.name),
      'Plan name already exists',
    ),
  ]);
  let planDescription: string = '';
  let planExporting: boolean = false;

  $: isModelFreePlan = plan?.is_read_only ?? false;
  $: permissionError = isReadOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to edit this plan.';
  $: if (plan && plan.model) {
    hasCreateSnapshotPermission = featurePermissions.planSnapshot.canCreate(user, plan, plan.model) && !isReadOnly;
  }
  $: {
    if (plan && user) {
      hasPlanUpdatePermission = featurePermissions.plan.canUpdate(user, plan) && !isLocked && !importInProgress;
      hasPlanCollaboratorsUpdatePermission =
        featurePermissions.planCollaborators.canCreate(user, plan) && !isLocked && !importInProgress;
      hasChangePlanModelPermission = featurePermissions.plan.canUpdateModel(user, plan);
    } else {
      hasPlanUpdatePermission = false;
      hasPlanCollaboratorsUpdatePermission = false;
      hasChangePlanModelPermission = false;
    }
  }

  $: if (isFilteredBySimulation && $simulationDataset != null) {
    filteredPlanSnapshots = $planSnapshotsWithSimulations.filter(
      planSnapshot => planSnapshot.revision === $simulationDataset?.plan_revision,
    );
  } else {
    filteredPlanSnapshots = $planSnapshotsWithSimulations;
  }
  $: if ($plans) {
    planNameField.updateValidators([
      required,
      unique(
        $plans.filter(p => p.id !== plan?.id).map(p => p.name),
        'Plan name already exists',
      ),
    ]);
  }
  $: if (plan) {
    planNameField.validateAndSet(plan?.name ?? '');
    planDescription = plan.description ?? '';
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const editedPlan = plan;
    const {
      detail: { tag, type },
    } = event;
    if (!editedPlan || !hasPlanUpdatePermission) {
      return;
    }
    if (type === 'remove') {
      await effects.deletePlanTag(tag.id, editedPlan.id, user);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user, false)) || [];
      }
      const newPlanTags: PlanTagsInsertInput[] = tagsToAdd.map(({ id: tag_id }) => ({
        plan_id: editedPlan.id,
        tag_id,
      }));
      await effects.createPlanTags(newPlanTags, editedPlan, user, true);
    }
  }

  function onPlanCollaboratorsCreate(event: CustomEvent<PlanCollaborator[]>) {
    if (plan) {
      effects.createPlanCollaborators(plan, event.detail, user);
    }
  }

  function onPlanCollaboratorsDelete(event: CustomEvent<string>) {
    if (plan) {
      effects.deletePlanCollaborator(plan, event.detail, user);
    }
  }

  function onCreatePlanSnapshot(event: MouseEvent) {
    event.stopPropagation();
    if (plan) {
      effects.createPlanSnapshot(plan, user);
    }
  }

  function onToggleFilter() {
    isFilteredBySimulation = !isFilteredBySimulation;
  }

  async function openChangePlanMissionModelModal(e: Event) {
    e.stopPropagation();
    if (plan !== null) {
      const success = await effects.updatePlanMissionModel(plan, user);
      if (success) {
        dispatch('modelchange');
      }
    }
  }

  async function onPlanNameChange() {
    if (plan && hasPlanUpdatePermission && $planNameField.valid && $planNameField.value !== plan.name) {
      dispatch('namechange', $planNameField.value);
      effects.updatePlan(plan, { name: $planNameField.value }, user);
    }
  }

  async function onPlanDescriptionChange() {
    if (plan && hasPlanUpdatePermission && planDescription !== (plan.description ?? '')) {
      await effects.updatePlan(plan, { description: planDescription }, user);
    }
  }

  async function onExportPlan() {
    if (plan && !planExporting && !importInProgress && activityDirectivesMap) {
      planExporting = true;
      await exportPlan(plan, user, Object.values(activityDirectivesMap));
      planExporting = false;
    }
  }
</script>

<div class="plan-form">
  {#if plan}
    <fieldset>
      <Collapse title="Details" contentClass="px-1" showHeader={mode === 'plan'} padContent={mode === 'plan'}>
        <svelte:fragment slot="right">
          {#if mode === 'plan'}
            {#if planExporting}
              <button class="st-button icon progress" on:click|stopPropagation={() => {}}>
                <ProgressRadial strokeWidth={1} />
              </button>
            {:else}
              <span
                use:tooltip={{
                  content: importInProgress ? 'Import is incomplete – export is unavailable' : 'Export Plan JSON',
                }}
              >
                <button
                  class="st-button icon export"
                  disabled={!!importInProgress}
                  on:click|stopPropagation={onExportPlan}
                >
                  <FileUp size={16} />
                </button>
              </span>
            {/if}
          {/if}
        </svelte:fragment>
        <div class="plan-form-field">
          <Field field={planNameField} on:change={onPlanNameChange}>
            <Input layout="inline">
              <label use:tooltip={{ content: 'Name', placement: 'top' }} for="plan-name">Plan Name</label>
              <input
                autocomplete="off"
                class="st-input w-full"
                name="plan-name"
                placeholder="Enter a plan name"
                id="plan-name"
                use:permissionHandler={{
                  hasPermission: hasPlanUpdatePermission,
                  permissionError,
                }}
              />
            </Input>
          </Field>
        </div>
        <Input layout="inline" class="!items-baseline">
          <label for="plan-description">Description</label>
          <textarea
            aria-label="Description"
            id="plan-description"
            name="plan-description"
            class="st-input resize-y"
            rows={4}
            use:permissionHandler={{
              hasPermission: hasPlanUpdatePermission,
              permissionError,
            }}
            bind:value={planDescription}
            on:change={onPlanDescriptionChange}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'ID', placement: 'top' }} for="id">Plan ID</label>
          <input class="st-input w-full" disabled name="id" value={plan.id} id="id" />
        </Input>
        {#if isModelFreePlan}
          <Input layout="inline">
            <span>Model</span>
            <span class="text-muted-foreground" data-testid="modelFreePlanLabel">Model-free plan</span>
          </Input>
        {:else}
          <Input layout="inline">
            <label use:tooltip={{ content: 'Model Name', placement: 'top' }} for="modelName">Model Name</label>
            <div class="flex gap-1">
              <input
                class={cn('st-input w-full', !plan.model?.name ? 'border-destructive' : '')}
                readonly
                name="modelName"
                value={plan.model?.name ?? 'Model not found'}
                id="modelName"
              />
              <div
                use:permissionHandler={{
                  hasPermission: hasChangePlanModelPermission && !isReadOnly,
                  permissionError: isReadOnly
                    ? PlanStatusMessages.READ_ONLY
                    : "You don't have permission to change mission model",
                }}
                use:tooltip={{ content: !isReadOnly ? 'Change Mission Model' : '', placement: 'top' }}
              >
                <Button
                  class="shrink-0"
                  variant="outline"
                  size="icon"
                  disabled={isReadOnly}
                  on:click={openChangePlanMissionModelModal}
                  aria-label="Change mission model"
                >
                  <Pencil size={16} />
                </Button>
              </div>
            </div>
          </Input>
          <Input layout="inline">
            <label use:tooltip={{ content: 'Model ID', placement: 'top' }} for="modelId">Model ID</label>
            <input class="st-input w-full" disabled name="modelId" value={plan.model_id} id="modelId" />
          </Input>
          <Input layout="inline">
            <label use:tooltip={{ content: 'Model Version', placement: 'top' }} for="modelVersion">Model Version</label>
            <input
              class="st-input w-full"
              disabled
              name="modelVersion"
              value={plan.model?.version ?? 'Model not found'}
              id="modelVersion"
            />
          </Input>
        {/if}
        <PlanTimeBounds {plan} {user} {isReadOnly} hasUpdatePermission={hasPlanUpdatePermission} {permissionError} />
        <Input layout="inline">
          <label use:tooltip={{ content: 'Owner', placement: 'top' }} for="owner">Owner</label>
          <input class="st-input w-full" disabled name="owner" value={plan.owner} id="owner" />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Date Created', placement: 'top' }} for="createdAt">Date Created</label>
          <input
            class="st-input w-full"
            disabled
            name="createdAt"
            id="createdAt"
            value={getShortISOForDate(new Date(plan.created_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated At', placement: 'top' }} for="updatedAt">Updated At</label>
          <input
            class="st-input w-full"
            disabled
            name="updatedAt"
            id="updatedAt"
            value={getShortISOForDate(new Date(plan.updated_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated By', placement: 'top' }} for="updatedBy">Updated By</label>
          <input class="st-input w-full" disabled name="updatedBy" value={plan.updated_by} id="updatedBy" />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Revision', placement: 'top' }} for="revision">Revision</label>
          <input class="st-input w-full" disabled name="revision" value={plan.revision} id="revision" />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Collaborators', placement: 'top' }} for="collaborators">Collaborators</label>
          {#if usersLoading || userWriteablePlans === null}
            <input class="st-input w-full" disabled name="collaborators" value="Loading..." />
          {:else}
            <PlanCollaboratorInput
              name="collaborators"
              collaborators={plan.collaborators}
              {users}
              plans={userWriteablePlans}
              {plan}
              {user}
              on:create={onPlanCollaboratorsCreate}
              on:delete={onPlanCollaboratorsDelete}
              disabled={!hasPlanCollaboratorsUpdatePermission}
              use={[
                [
                  permissionHandler,
                  {
                    hasPermission: hasPlanCollaboratorsUpdatePermission,
                    permissionError,
                  },
                ],
              ]}
            />
          {/if}
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Tags', placement: 'top' }} for="tags">Tags</label>
          <TagsInput
            use={[
              [
                permissionHandler,
                {
                  hasPermission: hasPlanUpdatePermission,
                  permissionError,
                },
              ],
            ]}
            disabled={!hasPlanUpdatePermission}
            options={tags}
            selected={planTags}
            on:change={onTagsInputChange}
          />
        </Input>
      </Collapse>
    </fieldset>
    {#if mode === 'plan'}
      <fieldset>
        <Collapse title="Snapshots" padContent={false}>
          <div class="buttons" slot="right">
            {#if $simulationDatasetId >= 0}
              <FilterToggleButton
                label="Snapshot"
                offTooltipContent="Filter snapshots by selected simulation"
                onTooltipContent="Remove filter"
                isOn={isFilteredBySimulation}
                on:toggle={onToggleFilter}
              />
            {/if}
            <button
              class="st-button secondary"
              disabled={$initialPlanSnapshotsLoading}
              use:permissionHandler={{
                hasPermission: hasCreateSnapshotPermission,
                permissionError: isReadOnly
                  ? PlanStatusMessages.READ_ONLY
                  : 'You do not have permission to create a plan snapshot',
              }}
              on:click={onCreatePlanSnapshot}
            >
              Take Snapshot
            </button>
          </div>
          <div style="margin-top: 8px">
            <AsyncContentState
              loading={$initialPlanSnapshotsLoading}
              error={$planSnapshotsError || null}
              errorMessage="Failed to load plan snapshots"
              showRetry
              empty={!filteredPlanSnapshots.length}
              emptyMessage="No Plan Snapshots Found"
              on:retry={() => planSnapshots.restartSocket()}
            >
              <CardList>
                {#each filteredPlanSnapshots as planSnapshot (planSnapshot.snapshot_id)}
                  <PlanSnapshot
                    activePlanSnapshotId={$planSnapshotId}
                    planModelId={plan.model?.id}
                    {planSnapshot}
                    on:click={() => {
                      setQueryParam(SearchParameters.SNAPSHOT_ID, `${planSnapshot.snapshot_id}`, 'PUSH');
                      $planSnapshotId = planSnapshot.snapshot_id;
                      $planReadOnlySnapshot = true;

                      if (planSnapshot.simulation?.id != null) {
                        setQueryParam(SearchParameters.SIMULATION_DATASET_ID, `${planSnapshot.simulation?.id}`, 'PUSH');
                        $simulationDatasetId = planSnapshot.simulation?.id;

                        viewTogglePanel({ state: true, type: 'left', update: { leftComponentTop: 'SimulationPanel' } });
                      } else {
                        removeQueryParam(SearchParameters.SIMULATION_DATASET_ID);
                        $simulationDatasetId = -1;
                      }
                    }}
                    on:restore={() => plan && effects.restorePlanSnapshot(planSnapshot, plan, user)}
                    on:delete={() => effects.deletePlanSnapshot(planSnapshot, user)}
                  />
                {/each}
              </CardList>
            </AsyncContentState>
          </div>
        </Collapse>
      </fieldset>
    {/if}
  {/if}
</div>

<style>
  .plan-form fieldset:last-child {
    padding-bottom: 16px;
  }

  .buttons {
    column-gap: 4px;
    display: flex;
  }

  .plan-form-field :global(fieldset) {
    padding: 0;
  }

  .plan-form-field :global(fieldset .error *) {
    padding-left: calc(40% + 8px);
  }

  .export {
    border-radius: 50%;
    height: 28px;
    position: relative;
    width: 28px;
  }

  .progress {
    border: 0;
    border-radius: 50%;
    width: 28px;
    --progress-radial-background: var(--st-gray-20);
  }
  .progress:hover {
    background: none;
  }
</style>
