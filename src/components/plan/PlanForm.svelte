<svelte:options immutable={true} />

<script lang="ts">
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { planReadOnly, planReadOnlySnapshot } from '../../stores/plan';
  import { planSnapshotId, planSnapshotsWithSimulations } from '../../stores/planSnapshots';
  import { simulationDataset, simulationDatasetId } from '../../stores/simulation';
  import { viewTogglePanel } from '../../stores/views';
  import type { User, UserId } from '../../types/app';
  import type { Plan, PlanCollaborator, PlanSlimmer } from '../../types/plan';
  import type { PlanSnapshot as PlanSnapshotType } from '../../types/plan-snapshot';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { removeQueryParam, setQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import CardList from '../ui/CardList.svelte';
  import FilterToggleButton from '../ui/FilterToggleButton.svelte';
  import PlanCollaboratorInput from '../ui/Tags/PlanCollaboratorInput.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import PlanSnapshot from './PlanSnapshot.svelte';

  export let plan: Plan | null;
  export let planTags: Tag[];
  export let tags: Tag[] = [];
  export let user: User | null;
  export let users: UserId[] | null = null;
  export let userWriteablePlans: PlanSlimmer[] | null = null;

  let filteredPlanSnapshots: PlanSnapshotType[] = [];
  let isFilteredBySimulation: boolean = false;
  let hasCreateSnapshotPermission: boolean = false;
  let hasPlanUpdatePermission: boolean = false;
  let hasPlanCollaboratorsUpdatePermission: boolean = false;

  $: permissionError = $planReadOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to edit this plan.';
  $: if (plan) {
    hasCreateSnapshotPermission = featurePermissions.planSnapshot.canCreate(user, plan, plan.model) && !$planReadOnly;
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

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      await effects.deletePlanTags([tag.id], user);
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

  function onPlanCollaboratorCreate(event: CustomEvent<string>) {
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
</script>

<div class="plan-form">
  {#if plan}
    <fieldset>
      <Collapse title="Details">
        <Input layout="inline">
          <label use:tooltip={{ content: 'Name', placement: 'top' }} for="name">Plan Name</label>
          <input class="st-input w-100" disabled name="name" value={plan.name} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'ID', placement: 'top' }} for="id">Plan ID</label>
          <input class="st-input w-100" disabled name="id" value={plan.id} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model Name', placement: 'top' }} for="modelName">Model Name</label>
          <input class="st-input w-100" disabled name="modelName" value={plan.model.name} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model ID', placement: 'top' }} for="modelId">Model ID</label>
          <input class="st-input w-100" disabled name="modelId" value={plan.model_id} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model Version', placement: 'top' }} for="modelVersion">Model Version</label>
          <input class="st-input w-100" disabled name="modelVersion" value={plan.model.version} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Start Time (UTC)', placement: 'top' }} for="startTime">Start Time (UTC)</label
          >
          <input class="st-input w-100" disabled name="startTime" value={plan.start_time_doy} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'End Time (UTC)', placement: 'top' }} for="endTime">End Time (UTC)</label>
          <input class="st-input w-100" disabled name="endTime" value={plan.end_time_doy} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Owner', placement: 'top' }} for="owner">Owner</label>
          <input class="st-input w-100" disabled name="owner" value={plan.owner} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Date Created', placement: 'top' }} for="createdAt">Date Created</label>
          <input
            class="st-input w-100"
            disabled
            name="createdAt"
            value={getShortISOForDate(new Date(plan.created_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated At', placement: 'top' }} for="updatedAt">Updated At</label>
          <input
            class="st-input w-100"
            disabled
            name="updatedAt"
            value={getShortISOForDate(new Date(plan.updated_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated By', placement: 'top' }} for="updatedBy">Updated By</label>
          <input class="st-input w-100" disabled name="updatedBy" value={plan.updated_by} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Revision', placement: 'top' }} for="revision">Revision</label>
          <input class="st-input w-100" disabled name="revision" value={plan.revision} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Collaborators', placement: 'top' }} for="collaborators">Collaborators</label>
          {#if users === null || userWriteablePlans === null}
            <input class="st-input w-100" disabled name="collaborators" value="Loading..." />
          {:else}
            <PlanCollaboratorInput
              collaborators={plan.collaborators}
              {users}
              plans={userWriteablePlans}
              {plan}
              {user}
              on:create={onPlanCollaboratorsCreate}
              on:delete={onPlanCollaboratorCreate}
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
            use:permissionHandler={{
              hasPermission: hasCreateSnapshotPermission,
              permissionError: $planReadOnly
                ? PlanStatusMessages.READ_ONLY
                : 'You do not have permission to create a plan snapshot',
            }}
            on:click={onCreatePlanSnapshot}>Take Snapshot</button
          >
        </div>
        <div style="margin-top: 8px">
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
            {#if filteredPlanSnapshots.length < 1}
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
</style>
