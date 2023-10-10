<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { constraintsFormColumns } from '../../stores/constraints';
  import type { User } from '../../types/app';
  import type { Constraint } from '../../types/constraint';
  import type { ModelSlim } from '../../types/model';
  import type { PlanSlim } from '../../types/plan';
  import type { ConstraintTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { diffTags } from '../../utilities/tags';
  import PageTitle from '../app/PageTitle.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import ConstraintEditor from './ConstraintEditor.svelte';

  export let initialConstraintDefinition: string = 'export default (): Constraint => {\n\n}\n';
  export let initialConstraintDescription: string = '';
  export let initialConstraintId: number | null = null;
  export let initialConstraintName: string = '';
  export let initialConstraintModelId: number | null = null;
  export let initialConstraintPlanId: number | null = null;
  export let initialConstraintTags: Tag[] = [];
  export let initialModelMap: Record<number, ModelSlim> = {};
  export let initialModels: ModelSlim[] = [];
  export let initialPlanMap: Record<number, PlanSlim> = {};
  export let initialPlans: PlanSlim[] = [];
  export let initialTags: Tag[] = [];
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  const permissionError = `You do not have permission to ${mode === 'edit' ? 'edit this' : 'create a'} constraint.`;

  let constraintDefinition: string = initialConstraintDefinition;
  let constraintDescription: string = initialConstraintDescription;
  let constraintId: number | null = initialConstraintId;
  let constraintName: string = initialConstraintName;
  let constraintModelId: number | null = initialConstraintModelId;
  let constraintPlanId: number | null = initialConstraintPlanId;
  let constraintTags: Tag[] = initialConstraintTags;
  let hasPermission: boolean = false;
  let models: ModelSlim[] = initialModels;
  let plans: PlanSlim[] = initialPlans;
  let saveButtonEnabled: boolean = false;
  let savedConstraint: Partial<Constraint> = {
    definition: constraintDefinition,
    description: constraintDescription,
    model_id: constraintModelId,
    name: constraintName,
    plan_id: constraintPlanId,
    tags: constraintTags.map(tag => ({ tag })),
  };

  $: constraintModified = diffConstraints(savedConstraint, {
    definition: constraintDefinition,
    description: constraintDescription,
    model_id: constraintModelId,
    name: constraintName,
    plan_id: constraintPlanId,
    tags: constraintTags.map(tag => ({ tag })),
  });
  $: {
    if (constraintPlanId !== null) {
      hasPermission = hasPlanPermission(initialPlanMap[constraintPlanId], mode, user);
    } else if (constraintModelId !== null) {
      hasPermission = hasModelPermission(constraintModelId, mode, user);
    } else {
      hasPermission = plans.reduce((prevPermission: boolean, plan) => {
        return prevPermission || hasPlanPermission(plan, mode, user);
      }, false);
    }
  }
  $: pageTitle = mode === 'edit' ? 'Constraints' : 'New Constraint';
  $: pageSubtitle = mode === 'edit' ? savedConstraint.name : '';
  $: saveButtonEnabled =
    constraintDefinition !== '' && constraintName !== '' && (constraintModelId !== null || constraintPlanId !== null);
  $: saveButtonText = mode === 'edit' && !constraintModified ? 'Saved' : 'Save';
  $: saveButtonClass = saveButtonEnabled && constraintModified ? 'primary' : 'secondary';

  $: if (constraintPlanId !== null) {
    const plan = initialPlans.find(plan => plan.id === constraintPlanId);
    if (plan) {
      constraintModelId = plan.model_id;
    }
  }

  function hasModelPermission(modelId: number, mode: 'create' | 'edit', user: User | null): boolean {
    const model = initialModelMap[modelId];
    if (user && model) {
      return model.plans.reduce((prevPermission: boolean, { id }: { id: number }) => {
        const plan = initialPlanMap[id];
        if (plan) {
          return (
            prevPermission ||
            (mode === 'create'
              ? featurePermissions.constraints.canCreate(user, plan)
              : featurePermissions.constraints.canUpdate(user, plan))
          );
        }
        return prevPermission;
      }, false);
    }

    return true;
  }

  function hasPlanPermission(plan: PlanSlim, mode: 'create' | 'edit', user: User | null): boolean {
    if (user) {
      return mode === 'create'
        ? featurePermissions.constraints.canCreate(user, plan)
        : featurePermissions.constraints.canUpdate(user, plan);
    }
    return false;
  }

  function diffConstraints(constraintA: Partial<Constraint>, constraintB: Partial<Constraint>) {
    if (
      constraintA.definition !== constraintB.definition ||
      constraintA.description !== constraintB.description ||
      constraintA.name !== constraintB.name ||
      constraintA.plan_id !== constraintB.plan_id ||
      diffTags(
        (constraintA.tags || []).map(({ tag }) => tag),
        (constraintB.tags || []).map(({ tag }) => tag),
      )
    ) {
      return true;
    } else if (constraintA.plan_id === null && constraintB.plan_id === null) {
      // only diff model_id if both plan_ids are null
      // to replicate the behavior where when saving a constraint, the model_id is ignored
      // if a plan_id is supplied
      return constraintA.model_id !== constraintB.model_id;
    }
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    constraintDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveConstraint();
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      constraintTags = constraintTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      constraintTags = constraintTags.concat(tagsToAdd);
    }
  }

  async function saveConstraint() {
    if (saveButtonEnabled) {
      if (mode === 'create') {
        const newConstraintId = await effects.createConstraint(
          constraintDefinition,
          constraintModelId ? initialModelMap[constraintModelId] : null,
          constraintName,
          constraintPlanId ? initialPlanMap[constraintPlanId] : null,
          user,
          constraintDescription,
          initialPlans,
        );

        if (newConstraintId !== null) {
          // Associate new tags with constraint
          const newConstraintTags: ConstraintTagsInsertInput[] = (constraintTags || []).map(({ id: tag_id }) => ({
            constraint_id: newConstraintId,
            tag_id,
          }));
          await effects.createConstraintTags(newConstraintTags, user);
          goto(`${base}/constraints/edit/${newConstraintId}`);
        }
      } else if (mode === 'edit' && constraintId !== null) {
        await effects.updateConstraint(
          constraintId,
          constraintDefinition,
          constraintModelId ? initialModelMap[constraintModelId] : null,
          constraintName,
          constraintPlanId ? initialPlanMap[constraintPlanId] : null,
          user,
          initialPlans,
          constraintDescription,
        );

        // Associate new tags with constraint
        const newConstraintTags: ConstraintTagsInsertInput[] = (constraintTags || []).map(({ id: tag_id }) => ({
          constraint_id: constraintId as number,
          tag_id,
        }));
        await effects.createConstraintTags(newConstraintTags, user);

        // Disassociate old tags from constraint
        const unusedTags = initialConstraintTags
          .filter(tag => !constraintTags.find(t => tag.id === t.id))
          .map(tag => tag.id);
        await effects.deleteConstraintTags(unusedTags, user);

        savedConstraint = {
          definition: constraintDefinition,
          description: constraintDescription,
          model_id: constraintModelId,
          name: constraintName,
          plan_id: constraintPlanId,
          tags: constraintTags.map(tag => ({ tag })),
        };
      }
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$constraintsFormColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Constraint' : 'Edit Constraint'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/constraints`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
          on:click={saveConstraint}
        >
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="constraintId">Constraint ID</label>
          <input class="st-input w-100" disabled name="constraintId" value={constraintId} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="model">Model</label>
        <select
          bind:value={constraintModelId}
          class="st-select w-100"
          disabled={constraintPlanId !== null}
          name="model"
          use:permissionHandler={{
            hasPermission,
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
          bind:value={constraintPlanId}
          class="st-select w-100"
          name="plan"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        >
          <option value={null} />
          {#each plans as plan}
            <option value={plan.id} disabled={!hasPlanPermission(plan, mode, user)}>
              {plan.name} ({plan.id})
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="constraint-name">Name</label>
        <input
          bind:value={constraintName}
          autocomplete="off"
          class="st-input w-100"
          name="constraint-name"
          placeholder="Enter Constraint Name (required)"
          required
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="constraint-description">Description</label>
        <textarea
          bind:value={constraintDescription}
          autocomplete="off"
          class="st-input w-100"
          name="constraint-description"
          placeholder="Enter Constraint Description (optional)"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="tags">Tags</label>
        <TagsInput
          use={[
            [
              permissionHandler,
              {
                hasPermission,
                permissionError,
              },
            ],
          ]}
          options={initialTags}
          selected={constraintTags}
          on:change={onTagsInputChange}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ConstraintEditor
    {constraintDefinition}
    {constraintModelId}
    {constraintPlanId}
    readOnly={!hasPermission}
    title="{mode === 'create' ? 'New' : 'Edit'} Constraint - Definition Editor"
    {user}
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
