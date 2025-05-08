<svelte:options immutable={true} />

<script lang="ts">
  import ExportIcon from '../../assets/export.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { field } from '../../stores/form';
  import { planMetadata, planReadOnly, planReadOnlySnapshot } from '../../stores/plan';
  import {
    initialPlanSnapshotsLoading,
    planSnapshotId,
    planSnapshotsWithSimulations,
  } from '../../stores/planSnapshots';
  import { plans } from '../../stores/plans';
  import { plugins } from '../../stores/plugins';
  import { simulationDataset, simulationDatasetId } from '../../stores/simulation';
  import { viewTogglePanel } from '../../stores/views';
  import type { ActivityDirectivesMap } from '../../types/activity';
  import type { User, UserId } from '../../types/app';
  import type { Plan, PlanCollaborator, PlanSlimmer } from '../../types/plan';
  import type { PlanSnapshot as PlanSnapshotType } from '../../types/plan-snapshot';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { removeQueryParam, setQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { exportPlan } from '../../utilities/plan';
  import { convertDoyToYmd, formatDate, getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, unique } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import Loading from '../Loading.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import CardList from '../ui/CardList.svelte';
  import FilterToggleButton from '../ui/FilterToggleButton.svelte';
  import ProgressRadial from '../ui/ProgressRadial.svelte';
  import PlanCollaboratorInput from '../ui/Tags/PlanCollaboratorInput.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import PlanSnapshot from './PlanSnapshot.svelte';

  export let plan: Plan | null;
  export let activityDirectivesMap: ActivityDirectivesMap | null = {};
  export let planTags: Tag[];
  export let tags: Tag[] = [];
  export let user: User | null;
  export let users: UserId[] | null = null;
  export let usersLoading: boolean = false;
  export let userWriteablePlans: PlanSlimmer[] | null = null;

  let filteredPlanSnapshots: PlanSnapshotType[] = [];
  let isFilteredBySimulation: boolean = false;
  let hasCreateSnapshotPermission: boolean = false;
  let hasPlanUpdatePermission: boolean = false;
  let hasPlanCollaboratorsUpdatePermission: boolean = false;
  let planNameField = field<string>('', [
    required,
    unique(
      ($plans || []).filter(p => p.id !== plan?.id).map(p => p.name),
      'Plan name already exists',
    ),
  ]);
  let planExporting: boolean = false;
  let planStartTime: string = '';
  let planEndTime: string = '';

  $: permissionError = $planReadOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to edit this plan.';
  $: if (plan) {
    hasCreateSnapshotPermission = featurePermissions.planSnapshot.canCreate(user, plan, plan.model) && !$planReadOnly;
    planStartTime = formatDate(new Date(plan.start_time), $plugins.time.primary.format);
    const endTime = convertDoyToYmd(plan.end_time_doy);
    if (endTime) {
      planEndTime = formatDate(new Date(endTime), $plugins.time.primary.format);
    } else {
      planEndTime = '';
    }
  }
  $: {
    if (plan && user) {
      hasPlanUpdatePermission = featurePermissions.plan.canUpdate(user, plan) && !$planReadOnly;
      hasPlanCollaboratorsUpdatePermission =
        featurePermissions.planCollaborators.canCreate(user, plan) && !$planReadOnly;
    } else {
      hasPlanUpdatePermission = false;
      hasPlanCollaboratorsUpdatePermission = false;
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
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove' && plan) {
      await effects.deletePlanTag(tag.id, plan.id, user);
    } else if (plan && (type === 'create' || type === 'select')) {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user, false)) || [];
      }
      const newPlanTags: PlanTagsInsertInput[] = tagsToAdd.map(({ id: tag_id }) => ({
        plan_id: plan?.id || -1,
        tag_id,
      }));
      await effects.createPlanTags(newPlanTags, plan, user, true);
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

  async function onPlanNameChange() {
    if (plan && $planNameField.dirtyAndValid && $planNameField.value) {
      // Optimistically update plan metadata
      planMetadata.updateValue(pm => (pm ? { ...pm, name: $planNameField.value } : null));
      effects.updatePlan(plan, { name: $planNameField.value }, user);
    }
  }

  async function onExportPlan() {
    if (plan && !planExporting && activityDirectivesMap) {
      planExporting = true;
      await exportPlan(plan, user, Object.values(activityDirectivesMap));
      planExporting = false;
    }
  }
</script>

<div class="plan-form">
  {#if plan}
    <fieldset>
      <Collapse title="Details" contentClass="px-1">
        <svelte:fragment slot="right">
          {#if planExporting}
            <button class="st-button icon progress" on:click|stopPropagation={() => {}}>
              <ProgressRadial strokeWidth={1} />
            </button>
          {:else}
            <button
              class="st-button icon export"
              on:click|stopPropagation={onExportPlan}
              use:tooltip={{ content: 'Export Plan JSON' }}
            >
              <ExportIcon />
            </button>
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
                use:permissionHandler={{
                  hasPermission: hasPlanUpdatePermission,
                  permissionError,
                }}
              />
            </Input>
          </Field>
        </div>
        <Input layout="inline">
          <label use:tooltip={{ content: 'ID', placement: 'top' }} for="id">Plan ID</label>
          <input class="st-input w-full" disabled name="id" value={plan.id} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model Name', placement: 'top' }} for="modelName">Model Name</label>
          <input class="st-input w-full" disabled name="modelName" value={plan.model.name} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model ID', placement: 'top' }} for="modelId">Model ID</label>
          <input class="st-input w-full" disabled name="modelId" value={plan.model_id} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model Version', placement: 'top' }} for="modelVersion">Model Version</label>
          <input class="st-input w-full" disabled name="modelVersion" value={plan.model.version} />
        </Input>
        <Input layout="inline">
          <label
            use:tooltip={{ content: `Start Time (${$plugins.time.primary.label})`, placement: 'top' }}
            for="startTime"
          >
            Start Time ({$plugins.time.primary.label})
          </label>
          <input class="st-input w-full" disabled name="startTime" value={planStartTime} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: `End Time (${$plugins.time.primary.label})`, placement: 'top' }} for="endTime">
            End Time ({$plugins.time.primary.label})
          </label>
          <input class="st-input w-full" disabled name="endTime" value={planEndTime} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Owner', placement: 'top' }} for="owner">Owner</label>
          <input class="st-input w-full" disabled name="owner" value={plan.owner} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Date Created', placement: 'top' }} for="createdAt">Date Created</label>
          <input
            class="st-input w-full"
            disabled
            name="createdAt"
            value={getShortISOForDate(new Date(plan.created_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated At', placement: 'top' }} for="updatedAt">Updated At</label>
          <input
            class="st-input w-full"
            disabled
            name="updatedAt"
            value={getShortISOForDate(new Date(plan.updated_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated By', placement: 'top' }} for="updatedBy">Updated By</label>
          <input class="st-input w-full" disabled name="updatedBy" value={plan.updated_by} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Revision', placement: 'top' }} for="revision">Revision</label>
          <input class="st-input w-full" disabled name="revision" value={plan.revision} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Collaborators', placement: 'top' }} for="collaborators">Collaborators</label>
          {#if usersLoading || userWriteablePlans === null}
            <input class="st-input w-full" disabled name="collaborators" value="Loading..." />
          {:else}
            <PlanCollaboratorInput
              name="collaborators"
              collaborators={plan.collaborators}
              users={users || []}
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
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to create a plan snapshot',
            }}
            on:click={onCreatePlanSnapshot}
          >
            Take Snapshot
          </button>
        </div>
        <div style="margin-top: 8px">
          {#if $initialPlanSnapshotsLoading}
            <Loading />
          {/if}
          <CardList>
            {#each filteredPlanSnapshots as planSnapshot (planSnapshot.snapshot_id)}
              <PlanSnapshot
                activePlanSnapshotId={$planSnapshotId}
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
            {#if !$initialPlanSnapshotsLoading && filteredPlanSnapshots.length < 1}
              <div class="st-typography-label">No Plan Snapshots Found</div>
            {/if}
          </CardList>
        </div>
      </Collapse>
    </fieldset>
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
