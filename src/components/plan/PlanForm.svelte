<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import DownloadIcon from '@nasa-jpl/stellar/icons/download.svg?component';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { SearchParameters } from '../../enums/searchParameters';
  import { field } from '../../stores/form';
  import { planMetadata, planReadOnly, planReadOnlySnapshot } from '../../stores/plan';
  import { planSnapshotId, planSnapshotsWithSimulations } from '../../stores/planSnapshots';
  import { plans } from '../../stores/plans';
  import { plugins } from '../../stores/plugins';
  import { simulationDataset, simulationDatasetId } from '../../stores/simulation';
  import { viewTogglePanel } from '../../stores/views';
  import type { ActivityDirective, ActivityDirectiveId } from '../../types/activity';
  import type { User, UserId } from '../../types/app';
  import type { ArgumentsMap } from '../../types/parameter';
  import type { Plan, PlanCollaborator, PlanSlimmer, PlanTransfer } from '../../types/plan';
  import type { PlanSnapshot as PlanSnapshotType } from '../../types/plan-snapshot';
  import type { Simulation } from '../../types/simulation';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { removeQueryParam, setQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getPlanForTransfer } from '../../utilities/plan';
  import { convertDoyToYmd, formatDate, getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import { required, unique } from '../../utilities/validators';
  import Collapse from '../Collapse.svelte';
  import Field from '../form/Field.svelte';
  import Input from '../form/Input.svelte';
  import CardList from '../ui/CardList.svelte';
  import FilterToggleButton from '../ui/FilterToggleButton.svelte';
  import ProgressRadial from '../ui/ProgressRadial.svelte';
  import PlanCollaboratorInput from '../ui/Tags/PlanCollaboratorInput.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import PlanSnapshot from './PlanSnapshot.svelte';

  export let plan: Plan | null;
  export let activityDirectivesMap: Record<ActivityDirectiveId, ActivityDirective> = {};
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
  let planExportAbortController: AbortController | null = null;
  let planNameField = field<string>('', [
    required,
    unique(
      $plans.filter(p => p.id !== plan?.id).map(p => p.name),
      'Plan name already exists',
    ),
  ]);
  let planExportProgress: number | null = null;
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

  async function exportPlan() {
    if (plan) {
      if (planExportAbortController) {
        planExportAbortController.abort();
      }

      planExportAbortController = new AbortController();

      let qualifiedActivityDirectives: ActivityDirective[] = [];
      planExportProgress = 0;

      let totalProgress = 0;
      const numOfDirectives = Object.values(activityDirectivesMap).length;

      const simulation: Simulation | null = await effects.getPlanLatestSimulation(plan.id, user);

      const simulationArguments: ArgumentsMap = simulation
        ? {
            ...simulation.template?.arguments,
            ...simulation.arguments,
          }
        : {};

      qualifiedActivityDirectives = (
        await Promise.all(
          Object.values(activityDirectivesMap).map(async activityDirective => {
            if (plan) {
              const effectiveArguments = await effects.getEffectiveActivityArguments(
                plan?.model_id,
                activityDirective.type,
                activityDirective.arguments,
                user,
                planExportAbortController?.signal,
              );

              totalProgress++;
              planExportProgress = (totalProgress / numOfDirectives) * 100;

              return {
                ...activityDirective,
                arguments: effectiveArguments?.arguments ?? activityDirective.arguments,
              };
            }

            totalProgress++;
            planExportProgress = (totalProgress / numOfDirectives) * 100;

            return activityDirective;
          }),
        )
      ).sort((directiveA, directiveB) => {
        if (directiveA.id < directiveB.id) {
          return -1;
        }
        if (directiveA.id > directiveB.id) {
          return 1;
        }
        return 0;
      });

      if (planExportAbortController && !planExportAbortController.signal.aborted) {
        const planExport: PlanTransfer = getPlanForTransfer(plan, qualifiedActivityDirectives, simulationArguments);

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(planExport, null, 2)], { type: 'application/json' }));
        a.download = planExport.name;
        a.click();
      }
      planExportProgress = null;
    }
  }

  function cancelPlanExport() {
    planExportAbortController?.abort();
    planExportAbortController = null;
  }

  function onPlanExport() {
    if (planExportProgress === null) {
      exportPlan();
    } else {
      cancelPlanExport();
    }
  }
</script>

<div class="plan-form">
  {#if plan}
    <fieldset>
      <Collapse title="Details">
        <svelte:fragment slot="right">
          <button
            class="st-button icon export"
            on:click|stopPropagation={onPlanExport}
            use:tooltip={{ content: planExportProgress === null ? 'Export Plan JSON' : 'Cancel Plan Export' }}
          >
            {#if planExportProgress !== null}
              <ProgressRadial progress={planExportProgress} useBackground={false} />
              <div class="cancel"><CloseIcon /></div>
            {:else}
              <DownloadIcon />
            {/if}
          </button>
        </svelte:fragment>
        <div class="plan-form-field">
          <Field field={planNameField} on:change={onPlanNameChange}>
            <Input layout="inline">
              <label use:tooltip={{ content: 'Name', placement: 'top' }} for="plan-name">Plan Name</label>
              <input
                autocomplete="off"
                class="st-input w-100"
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
          <label
            use:tooltip={{ content: `Start Time (${$plugins.time.primary.label})`, placement: 'top' }}
            for="startTime"
          >
            Start Time ({$plugins.time.primary.label})
          </label>
          <input class="st-input w-100" disabled name="startTime" value={planStartTime} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: `End Time (${$plugins.time.primary.label})`, placement: 'top' }} for="endTime">
            End Time ({$plugins.time.primary.label})
          </label>
          <input class="st-input w-100" disabled name="endTime" value={planEndTime} />
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
              on:delete={onPlanCollaboratorsDelete}
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
            on:click={onCreatePlanSnapshot}
          >
            Take Snapshot
          </button>
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

  .plan-form-field :global(fieldset) {
    padding: 0;
  }

  .plan-form-field :global(fieldset .error *) {
    padding-left: calc(40% + 8px);
  }

  .export {
    border-radius: 50%;
    position: relative;
  }
  .export .cancel {
    display: none;
  }

  .export:hover .cancel {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  }
</style>
