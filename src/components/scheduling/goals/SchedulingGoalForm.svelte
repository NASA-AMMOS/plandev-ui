<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { schedulingGoalsColumns } from '../../../stores/scheduling';
  import { tags } from '../../../stores/tags';
  import type { User } from '../../../types/app';
  import type { ModelSlim } from '../../../types/model';
  import type { PlanSchedulingSpec } from '../../../types/plan';
  import type { SchedulingGoal, SchedulingSpecGoalInsertInput } from '../../../types/scheduling';
  import type { SchedulingGoalTagsInsertInput, Tag, TagsChangeEvent } from '../../../types/tags';
  import effects from '../../../utilities/effects';
  import { isSaveEvent } from '../../../utilities/keyboardEvents';
  import { showConfirmModal } from '../../../utilities/modal';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions, isUserAdmin } from '../../../utilities/permissions';
  import { diffTags } from '../../../utilities/tags';
  import PageTitle from '../../app/PageTitle.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import CssGridGutter from '../../ui/CssGridGutter.svelte';
  import Panel from '../../ui/Panel.svelte';
  import SectionTitle from '../../ui/SectionTitle.svelte';
  import TagsInput from '../../ui/Tags/Tags.svelte';
  import SchedulingEditor from '../SchedulingEditor.svelte';

  export let initialGoalAuthor: string | null = null;
  export let initialGoalCreatedDate: string | null = null;
  export let initialGoalDefinition: string = 'export default (): Goal => {\n\n}\n';
  export let initialGoalDescription: string = '';
  export let initialGoalId: number | null = null;
  export let initialGoalModelId: number | null = null;
  export let initialGoalModifiedDate: string | null = null;
  export let initialGoalName: string = '';
  export let initialGoalTags: Tag[] = [];
  export let initialSpecId: number | null = null;
  export let mode: 'create' | 'edit' = 'create';
  export let plans: PlanSchedulingSpec[] = [];
  export let models: ModelSlim[] = [];
  export let user: User | null;

  const permissionError = 'You do not have permission to edit this scheduling goal.';

  let goalAuthor: string | null = initialGoalAuthor;
  let goalCreatedDate: string | null = initialGoalCreatedDate;
  let goalDefinition: string = initialGoalDefinition;
  let goalDescription: string = initialGoalDescription;
  let goalId: number | null = initialGoalId;
  let goalModelId: number | null = initialGoalModelId;
  let goalModifiedDate: string | null = initialGoalModifiedDate;
  let goalName: string = initialGoalName;
  let goalTags: Tag[] = initialGoalTags;
  let hasAuthoringPermission: boolean = false;
  let hasPermission: boolean = false;
  let saveButtonEnabled: boolean = false;
  let specId: number | null = initialSpecId;
  let savedSpecId: number | null = initialSpecId;
  let savedGoal: Partial<SchedulingGoal> = {
    definition: goalDefinition,
    description: goalDescription,
    name: goalName,
    tags: goalTags.map(tag => ({ tag })),
    ...(goalModelId !== null ? { model_id: goalModelId } : {}),
  };

  $: planOptions = plans
    .filter(plan => plan.model_id === goalModelId)
    .map(({ id, name, scheduling_specifications }) => ({
      id,
      name,
      specId: (scheduling_specifications && scheduling_specifications[0]?.id) || null,
    }));

  $: specId = planOptions.some(plan => plan.specId === specId) ? specId : null; // Null the specId value if the filtered plan list no longer includes the chosen spec
  $: saveButtonEnabled = goalDefinition !== '' && goalModelId !== null && goalName !== '' && specId !== null;
  $: goalModified =
    diffGoals(savedGoal, {
      definition: goalDefinition,
      description: goalDescription,
      name: goalName,
      tags: goalTags.map(tag => ({ tag })),
      ...(goalModelId !== null ? { model_id: goalModelId } : {}),
    }) || specId !== savedSpecId;
  $: if (user) {
    hasPermission = specId
      ? hasPlanPermission(planOptions.find(plan => plan.specId === specId)?.id, mode, user)
      : goalModelId
      ? hasModelPermission(goalModelId, mode, user)
      : hasAnyPlanPermission(mode, user);
  }
  $: hasAuthoringPermission = mode === 'edit' ? isUserAdmin(user) : true;
  $: saveButtonText = mode === 'edit' && !goalModified ? 'Saved' : 'Save';
  $: saveButtonClass = goalModified && saveButtonEnabled ? 'primary' : 'secondary';
  $: pageTitle = mode === 'edit' ? 'Scheduling Goals' : 'New Scheduling Goal';
  $: pageSubtitle = mode === 'edit' ? savedGoal.name : '';

  function hasModelPermission(modelId: number, mode: 'create' | 'edit', user: User | null): boolean {
    const plansFromModel = plans.filter(plan => plan.model_id === modelId);
    return plansFromModel.some(plan => {
      return (
        (mode === 'create' && featurePermissions.schedulingGoals.canCreate(user, plan)) ||
        featurePermissions.schedulingGoals.canUpdate(user, plan)
      );
    });
  }

  function hasAnyPlanPermission(mode: 'create' | 'edit', user: User | null): boolean {
    return plans.some(plan => {
      return mode === 'create'
        ? featurePermissions.schedulingGoals.canCreate(user, plan)
        : featurePermissions.schedulingGoals.canUpdate(user, plan);
    });
  }

  function hasPlanPermission(planId: number | undefined, mode: 'create' | 'edit', user: User | null): boolean {
    const plan = plans.find(plan => plan.id === planId);
    if (plan) {
      return mode === 'create'
        ? featurePermissions.schedulingGoals.canCreate(user, plan)
        : featurePermissions.schedulingGoals.canUpdate(user, plan);
    }
    return false;
  }

  function diffGoals(goalA: Partial<SchedulingGoal>, goalB: Partial<SchedulingGoal>) {
    return Object.entries(goalA).some(([key, value]) => {
      if (key === 'tags') {
        return diffTags(
          (goalA.tags || []).map(({ tag }) => tag),
          (goalB.tags || []).map(({ tag }) => tag),
        );
      } else {
        return goalB[key as keyof SchedulingGoal] !== value;
      }
    });
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    goalDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveGoal();
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      goalTags = goalTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      goalTags = goalTags.concat(tagsToAdd);
    }
  }

  async function saveGoal() {
    if (saveButtonEnabled && goalModelId !== null) {
      if (mode === 'create') {
        const newGoal = await effects.createSchedulingGoal(
          goalDefinition,
          goalName,
          goalModelId,
          user,
          goalDescription,
        );

        if (newGoal !== null && specId !== null) {
          const { id: newGoalId } = newGoal;

          const specGoalInsertInput: SchedulingSpecGoalInsertInput = {
            enabled: true,
            goal_id: newGoalId,
            specification_id: specId,
          };

          await effects.createSchedulingSpecGoal(specGoalInsertInput, user);

          // Associate new tags with expansion rule
          const newSchedulingGoalRuleTags: SchedulingGoalTagsInsertInput[] = goalTags.map(({ id: tag_id }) => ({
            goal_id: newGoalId,
            tag_id,
          }));
          await effects.createSchedulingGoalTags(newSchedulingGoalRuleTags, user);

          goto(`${base}/scheduling/goals/edit/${newGoalId}`);
        }
      } else if (mode === 'edit') {
        if (goalId === null) {
          return;
        }
        if (specId !== savedSpecId) {
          const { confirm } = await showConfirmModal(
            'Confirm',
            'Updating the plan will reset the priority of this scheduling goal.',
            'Updating Plan',
            true,
          );

          if (!confirm) {
            return;
          }
        }

        const goal: Partial<SchedulingGoal> = {
          definition: goalDefinition,
          description: goalDescription,
          ...(hasAuthoringPermission && goalModelId !== null ? { model_id: goalModelId } : {}),
          name: goalName,
        };
        const updatedGoal = await effects.updateSchedulingGoal(goalId, goal, user);
        if (updatedGoal) {
          if (specId !== savedSpecId && savedSpecId !== null && specId !== null) {
            // If changing plans/specId, first delete existing scheduling_spec_goal record and re-insert a new one
            // this is to allow the insert triggers to keep priorities in sync.
            const deletedSchedulingSpecGoal = await effects.deleteSchedulingSpecGoal(goalId, savedSpecId, user);
            if (deletedSchedulingSpecGoal) {
              await effects.createSchedulingSpecGoal(
                { enabled: true, goal_id: goalId, specification_id: specId },
                user,
              );
              savedSpecId = specId;
            }
          }

          // Associate new tags with scheduling goal
          const newSchedulingGoalTags: SchedulingGoalTagsInsertInput[] = goalTags.map(({ id: tag_id }) => ({
            goal_id: goalId as number,
            tag_id,
          }));
          await effects.createSchedulingGoalTags(newSchedulingGoalTags, user);

          // Disassociate old tags from constraint
          const unusedTags = initialGoalTags.filter(tag => !goalTags.find(t => tag.id === t.id)).map(tag => tag.id);
          await effects.deleteSchedulingGoalTags(unusedTags, user);

          goalModifiedDate = updatedGoal.modified_date;
          savedGoal = { ...goal, tags: goalTags.map(tag => ({ tag })) };
        }
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$schedulingGoalsColumns}>
  <Panel padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Scheduling Goal' : 'Edit Scheduling Goal'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/scheduling/goals`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          on:click|stopPropagation={saveGoal}
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        >
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="goalId">Goal ID</label>
          <input class="st-input w-100" disabled name="goalId" value={goalId} />
        </fieldset>

        <fieldset>
          <label for="createdAt">Created At</label>
          <input class="st-input w-100" disabled name="createdAt" value={goalCreatedDate} />
        </fieldset>

        <fieldset>
          <label for="updatedAt">Updated At</label>
          <input class="st-input w-100" disabled name="updatedAt" value={goalModifiedDate} />
        </fieldset>

        <fieldset>
          <label for="author">Original Author</label>
          <input class="st-input w-100" disabled name="author" value={goalAuthor} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="model">Model</label>
        <select
          bind:value={goalModelId}
          class="st-select w-100"
          name="model"
          use:permissionHandler={{
            hasPermission: hasAnyPlanPermission(mode, user) && hasAuthoringPermission,
            permissionError,
          }}
        >
          <option value={null} />
          {#each models as model}
            <option value={model.id} disabled={!hasModelPermission(model.id, mode, user)}>
              {model.name} ({model.id})
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="plan">Plan</label>
        <select
          bind:value={specId}
          class="st-select w-100"
          name="plan"
          use:permissionHandler={{
            hasPermission: hasAnyPlanPermission(mode, user),
            permissionError,
          }}
        >
          <option value={null} />
          {#each planOptions as plan}
            <option value={plan.specId} disabled={plan.specId === null || !hasPlanPermission(plan.id, mode, user)}>
              {plan.name} ({plan.id}) {#if plan.specId === null} (Missing Scheduling Specification) {/if}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="goal-name">Name</label>
        <input
          bind:value={goalName}
          autocomplete="off"
          class="st-input w-100"
          name="goal-name"
          placeholder="Enter Goal Name (required)"
          required
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="goal-description">Description</label>
        <textarea
          bind:value={goalDescription}
          autocomplete="off"
          class="st-input w-100"
          name="goal-description"
          placeholder="Enter Goal Description (optional)"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="tags">Tags</label>
        <TagsInput
          options={$tags}
          selected={goalTags}
          on:change={onTagsInputChange}
          use={[
            [
              permissionHandler,
              {
                hasPermission,
                permissionError,
              },
            ],
          ]}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SchedulingEditor
    scheduleItemDefinition={goalDefinition}
    scheduleItemModelId={goalModelId}
    title="{mode === 'create' ? 'New' : 'Edit'} Scheduling Goal - Definition Editor"
    {user}
    readOnly={!hasPermission}
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
