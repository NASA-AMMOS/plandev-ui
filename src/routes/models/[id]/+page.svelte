<svelte:options immutable={true} />

<script lang="ts" context="module">
  function isGoalSpecification(
    specification: ConstraintModelSpec | SchedulingGoalModelSpecification | SchedulingConditionModelSpecification,
  ): specification is SchedulingGoalModelSpecification {
    return !!(specification as SchedulingGoalModelSpecification).goal_metadata;
  }

  function isConditionSpecification(
    specification: ConstraintModelSpec | SchedulingGoalModelSpecification | SchedulingConditionModelSpecification,
  ): specification is SchedulingConditionModelSpecification {
    return !!(specification as SchedulingConditionModelSpecification).condition_metadata;
  }

  /**
   * Attempts to return the metadata from the subscribed store if available.
   * If no data is available yet, then it will use the data from the specification to build stubs in the meantime
   * @param metadataSubscription
   * @param model
   * @param modelKey
   */
  function getMetadata(
    metadataSubscription: BaseMetadata[],
    model: Model | undefined,
    modelKey: keyof Pick<
      Model,
      'constraint_specification' | 'scheduling_specification_conditions' | 'scheduling_specification_goals'
    >,
  ): Pick<BaseMetadata, 'id' | 'name' | 'owner' | 'public' | 'versions'>[] {
    return metadataSubscription.length
      ? metadataSubscription
      : model?.[modelKey]
          .map(metadata => {
            if (isGoalSpecification(metadata)) {
              return createInitialMetadata(metadata.goal_metadata);
            } else if (isConditionSpecification(metadata)) {
              return createInitialMetadata(metadata.condition_metadata);
            }
            return createInitialMetadata(metadata.constraint_metadata);
          })
          .filter(filterEmpty) ?? [];
  }

  /**
   * Because we only get `id` and `name` from the specification query to save on size, this function will fill in the missing data
   * needed to drive the UI.
   * This is only invoked when the full list of metadata is still downloading from the subscription
   * @param metadata
   * @param user
   */
  function createInitialMetadata(metadata: Pick<BaseMetadata, 'id' | 'name'> | null) {
    if (metadata) {
      return { ...metadata, owner: '', public: true, versions: [] };
    }
    return null;
  }

  /**
   * Determines if the user is allowed to view the metadata passed in
   * NOTE: this function is only needed until scheduling goals/conditions get the same permission treatment as constraints in Aerie
   * @param metadata
   * @param user
   */
  function isMetadataViewable(metadata: Pick<BaseMetadata, 'owner' | 'public'>, user: User | null) {
    if (metadata) {
      const { public: isPublic, owner } = metadata;
      if (!isPublic && !isAdminRole(user?.activeRole)) {
        return owner === user?.id;
      }
      return true;
    }
    return false;
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ModelAssociations from '../../../components/model/ModelAssociations.svelte';
  import ModelForm from '../../../components/model/ModelForm.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../../components/ui/CssGridGutter.svelte';
  import Panel from '../../../components/ui/Panel.svelte';
  import SectionTitle from '../../../components/ui/SectionTitle.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { constraints } from '../../../stores/constraints';
  import { initialModel, model } from '../../../stores/model';
  import { schedulingConditions, schedulingGoals } from '../../../stores/scheduling';
  import type { User, UserId } from '../../../types/app';
  import type { ConstraintModelSpec, ConstraintModelSpecInsertInput } from '../../../types/constraint';
  import type {
    Association,
    AssociationSpecification,
    AssociationSpecificationMap,
    BaseMetadata,
  } from '../../../types/metadata';
  import type { Model } from '../../../types/model';
  import type {
    SchedulingConditionModelSpecification,
    SchedulingConditionModelSpecificationInsertInput,
    SchedulingGoalModelSpecification,
    SchedulingGoalModelSpecificationInsertInput,
    SchedulingGoalModelSpecificationSetInput,
  } from '../../../types/scheduling';
  import effects from '../../../utilities/effects';
  import { filterEmpty } from '../../../utilities/generic';
  import { featurePermissions, isAdminRole } from '../../../utilities/permissions';
  import type { PageData } from './$types';

  export let data: PageData;

  let hasCreatePermission: boolean = false;
  let hasEditSpecPermission: boolean = false;
  let hasModelChanged: boolean = false;
  let metadataList: Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[] = [];
  let modelMetadata: {
    description?: string;
    name: string;
    owner: UserId;
    version: string;
  } | null = null;
  let initialModelMetadata: {
    description?: string;
    name: string;
    owner: UserId;
    version: string;
  } | null = null;
  let initialSelectedConstraintModelSpecifications: AssociationSpecificationMap;
  let initialSelectedConditionModelSpecifications: AssociationSpecificationMap;
  let initialSelectedGoalModelSpecifications: AssociationSpecificationMap;
  let selectedConstraintModelSpecifications: AssociationSpecificationMap;
  let selectedConditionModelSpecifications: AssociationSpecificationMap;
  let selectedGoalModelSpecifications: AssociationSpecificationMap;
  let selectedSpecifications: AssociationSpecificationMap = {};
  let selectedAssociation: Association = 'constraint';
  let user: User | null = null;

  $: user = data.user;
  $: if (data.initialModel) {
    $initialModel = data.initialModel;
    model.updateValue(() => data.initialModel);
  }
  $: if ($model) {
    initialModelMetadata = {
      description: $model.description,
      name: $model.name,
      owner: $model.owner,
      version: $model.version,
    };
    initialSelectedConditionModelSpecifications = $model.scheduling_specification_conditions.reduce(
      (selectedSpecs, conditionSpecification) => {
        return {
          ...selectedSpecs,
          [conditionSpecification.condition_id]: {
            revision: conditionSpecification.condition_revision,
            selected: true,
          },
        };
      },
      {},
    );
    initialSelectedConstraintModelSpecifications = $model.constraint_specification.reduce(
      (selectedSpecs, constraintSpecification) => {
        return {
          ...selectedSpecs,
          [constraintSpecification.constraint_id]: {
            revision: constraintSpecification.constraint_revision,
            selected: true,
          },
        };
      },
      {},
    );
    initialSelectedGoalModelSpecifications = $model.scheduling_specification_goals.reduce(
      (selectedSpecs, goalSpecification) => {
        return {
          ...selectedSpecs,
          [goalSpecification.goal_id]: {
            priority: goalSpecification.priority,
            revision: goalSpecification.goal_revision,
            selected: true,
          },
        };
      },
      {},
    );
    modelMetadata = { ...initialModelMetadata };
    selectedConditionModelSpecifications = { ...initialSelectedConditionModelSpecifications };
    selectedConstraintModelSpecifications = { ...initialSelectedConstraintModelSpecifications };
    selectedGoalModelSpecifications = { ...initialSelectedGoalModelSpecifications };
  }
  $: switch (selectedAssociation) {
    // goals require special logic because of priority management
    // goals must have consecutive priorities starting at 0
    case 'goal': {
      hasCreatePermission = featurePermissions.schedulingGoals.canCreate(user);
      hasEditSpecPermission = featurePermissions.schedulingGoalsModelSpec.canUpdate(user);
      metadataList = getMetadata($schedulingGoals, $model, 'scheduling_specification_goals').filter(goalMetadata =>
        isMetadataViewable(goalMetadata, user),
      );
      // only maintain a list of specifications added to the model if they exist in the db
      let selectedGoalModelSpecificationList: AssociationSpecification[] = $schedulingGoals.reduce(
        (prevSelectedGoalModelSpecifications: AssociationSpecification[], metadata) => {
          if (selectedGoalModelSpecifications[metadata.id]) {
            return [
              ...prevSelectedGoalModelSpecifications,
              {
                id: metadata.id,
                ...selectedGoalModelSpecifications[metadata.id],
              },
            ];
          }
          return prevSelectedGoalModelSpecifications;
        },
        [],
      );
      // modify existing priorities to ensure that they are consecutive
      let lastPriority = -1;
      selectedGoalModelSpecificationList = selectedGoalModelSpecificationList
        .sort((specificationA, specificationB) => {
          return (specificationA?.priority ?? 0) - (specificationB?.priority ?? 0);
        })
        .map(goalSpecification => {
          if (goalSpecification.selected && (goalSpecification.priority ?? 0 - lastPriority > 1)) {
            lastPriority = lastPriority + 1;
            return {
              ...goalSpecification,
              priority: lastPriority,
            };
          }
          lastPriority = goalSpecification.priority ?? 0;
          return goalSpecification;
        });

      selectedGoalModelSpecifications = selectedGoalModelSpecificationList.reduce(
        (prevSelectedGoalModelSpecifications: AssociationSpecificationMap, goalSpecification) => {
          return {
            ...prevSelectedGoalModelSpecifications,
            [goalSpecification.id]: {
              priority: goalSpecification.priority,
              revision: goalSpecification.revision,
              selected: goalSpecification.selected,
            },
          };
        },
        {},
      );
      selectedSpecifications = selectedGoalModelSpecifications;
      break;
    }
    case 'condition':
      hasCreatePermission = featurePermissions.schedulingConditions.canCreate(user);
      hasEditSpecPermission = featurePermissions.schedulingConditionsModelSpec.canUpdate(user);
      metadataList = getMetadata($schedulingConditions, $model, 'scheduling_specification_conditions').filter(
        conditionMetadata => isMetadataViewable(conditionMetadata, user),
      );
      selectedSpecifications = selectedConditionModelSpecifications;
      break;
    case 'constraint':
    default:
      hasCreatePermission = featurePermissions.constraints.canCreate(user);
      hasEditSpecPermission = featurePermissions.constraintsModelSpec.canUpdate(user);
      metadataList = getMetadata($constraints, $model, 'constraint_specification');
      selectedSpecifications = selectedConstraintModelSpecifications;
  }
  $: hasModelChanged =
    JSON.stringify(initialModelMetadata) !== JSON.stringify(modelMetadata) ||
    JSON.stringify(initialSelectedConditionModelSpecifications) !==
      JSON.stringify(selectedConditionModelSpecifications) ||
    JSON.stringify(initialSelectedConstraintModelSpecifications) !==
      JSON.stringify(selectedConstraintModelSpecifications) ||
    JSON.stringify(initialSelectedGoalModelSpecifications) !== JSON.stringify(selectedGoalModelSpecifications);

  function onClose() {
    goto(`${base}/models`);
  }

  function onCreatePlanWithModel(event: CustomEvent<number>) {
    const { detail: modelId } = event;

    goto(`${base}/plans?modelId=${modelId}`);
  }

  async function onDeleteModel() {
    if ($model) {
      await effects.deleteModel($model, user);

      onClose();
    }
  }

  function onModelMetadataChange(
    event: CustomEvent<{
      description: string;
      name: string;
      owner: UserId;
      version: string;
    }>,
  ) {
    const { detail: metadata } = event;

    modelMetadata = metadata;
  }

  function onNewMetadata() {
    switch (selectedAssociation) {
      case 'condition':
        window.open(`${base}/scheduling/conditions/new?${SearchParameters.MODEL_ID}=${$model?.id}`);
        break;
      case 'goal':
        window.open(`${base}/scheduling/goals/new?${SearchParameters.MODEL_ID}=${$model?.id}`);
        break;
      case 'constraint':
      default:
        window.open(`${base}/constraints/new?${SearchParameters.MODEL_ID}=${$model?.id}`);
    }
  }

  async function onSave() {
    if ($model && modelMetadata) {
      await effects.updateModel($model.id, modelMetadata, user);

      const constraintModelSpecUpdates: {
        constraintIdsToDelete: number[];
        constraintModelSpecsToAdd: ConstraintModelSpecInsertInput[];
      } = Object.keys(selectedConstraintModelSpecifications).reduce(
        (
          prevConstraintPlanSpecUpdates: {
            constraintIdsToDelete: number[];
            constraintModelSpecsToAdd: ConstraintModelSpecInsertInput[];
          },
          selectedConstraintId: string,
        ) => {
          const constraintId = parseInt(selectedConstraintId);
          const constraintSpecification = selectedConstraintModelSpecifications[constraintId];
          const isSelected = constraintSpecification.selected;
          if (isSelected) {
            return {
              ...prevConstraintPlanSpecUpdates,
              constraintModelSpecsToAdd: [
                ...prevConstraintPlanSpecUpdates.constraintModelSpecsToAdd,
                {
                  constraint_id: constraintId,
                  constraint_revision: constraintSpecification.revision,
                  model_id: $model?.id,
                } as ConstraintModelSpecInsertInput,
              ],
            };
          } else {
            return {
              ...prevConstraintPlanSpecUpdates,
              constraintIdsToDelete: [...prevConstraintPlanSpecUpdates.constraintIdsToDelete, constraintId],
            };
          }
        },
        {
          constraintIdsToDelete: [],
          constraintModelSpecsToAdd: [],
        },
      );
      await effects.updateConstraintModelSpecifications(
        $model,
        constraintModelSpecUpdates.constraintModelSpecsToAdd,
        constraintModelSpecUpdates.constraintIdsToDelete,
        user,
      );

      const conditionModelSpecUpdates: {
        conditionIdsToDelete: number[];
        conditionModelSpecsToAdd: SchedulingConditionModelSpecificationInsertInput[];
      } = Object.keys(selectedConditionModelSpecifications).reduce(
        (
          prevConstraintPlanSpecUpdates: {
            conditionIdsToDelete: number[];
            conditionModelSpecsToAdd: SchedulingConditionModelSpecificationInsertInput[];
          },
          selectedConstraintId: string,
        ) => {
          const conditionId = parseInt(selectedConstraintId);
          const conditionSpecification = selectedConditionModelSpecifications[conditionId];
          const isSelected = conditionSpecification.selected;
          if (isSelected) {
            return {
              ...prevConstraintPlanSpecUpdates,
              conditionModelSpecsToAdd: [
                ...prevConstraintPlanSpecUpdates.conditionModelSpecsToAdd,
                {
                  condition_id: conditionId,
                  condition_revision: conditionSpecification.revision,
                  model_id: $model?.id,
                } as SchedulingConditionModelSpecificationInsertInput,
              ],
            };
          } else {
            return {
              ...prevConstraintPlanSpecUpdates,
              conditionIdsToDelete: [...prevConstraintPlanSpecUpdates.conditionIdsToDelete, conditionId],
            };
          }
        },
        {
          conditionIdsToDelete: [],
          conditionModelSpecsToAdd: [],
        },
      );
      await effects.updateSchedulingConditionModelSpecifications(
        $model,
        conditionModelSpecUpdates.conditionModelSpecsToAdd,
        conditionModelSpecUpdates.conditionIdsToDelete,
        user,
      );

      const goalModelSpecUpdates: {
        goalIdsToDelete: number[];
        goalModelSpecsToAdd: SchedulingGoalModelSpecificationInsertInput[];
        goalModelSpecsToUpdate: SchedulingGoalModelSpecificationSetInput[];
      } = Object.keys(selectedGoalModelSpecifications).reduce(
        (
          prevConstraintPlanSpecUpdates: {
            goalIdsToDelete: number[];
            goalModelSpecsToAdd: SchedulingGoalModelSpecificationInsertInput[];
            goalModelSpecsToUpdate: SchedulingGoalModelSpecificationSetInput[];
          },
          selectedConstraintId: string,
        ) => {
          const goalId = parseInt(selectedConstraintId);
          const goalSpecification = selectedGoalModelSpecifications[goalId];
          const isSelected = goalSpecification.selected;

          if (isSelected && initialSelectedGoalModelSpecifications[goalId] === undefined) {
            return {
              ...prevConstraintPlanSpecUpdates,
              goalModelSpecsToAdd: [
                ...prevConstraintPlanSpecUpdates.goalModelSpecsToAdd,
                {
                  goal_id: goalId,
                  goal_revision: goalSpecification.revision,
                  model_id: $model?.id,
                  priority: goalSpecification.priority,
                } as SchedulingGoalModelSpecificationInsertInput,
              ],
            };
          } else if (isSelected) {
            return {
              ...prevConstraintPlanSpecUpdates,
              goalModelSpecsToUpdate: [
                ...prevConstraintPlanSpecUpdates.goalModelSpecsToUpdate,
                {
                  goal_id: goalId,
                  goal_revision: goalSpecification.revision,
                  model_id: $model?.id,
                  priority: goalSpecification.priority,
                } as SchedulingGoalModelSpecificationSetInput,
              ],
            };
          } else {
            return {
              ...prevConstraintPlanSpecUpdates,
              goalIdsToDelete: [...prevConstraintPlanSpecUpdates.goalIdsToDelete, goalId],
            };
          }
        },
        {
          goalIdsToDelete: [],
          goalModelSpecsToAdd: [],
          goalModelSpecsToUpdate: [],
        },
      );
      await effects.updateSchedulingGoalModelSpecifications(
        $model,
        goalModelSpecUpdates.goalModelSpecsToAdd.sort((goalA, goalB) => goalA.priority - goalB.priority),
        goalModelSpecUpdates.goalIdsToDelete,
        user,
      );
      for (let i = 0; i < goalModelSpecUpdates.goalModelSpecsToUpdate.length; i++) {
        const goalSpecUpdate = goalModelSpecUpdates.goalModelSpecsToUpdate[i];
        await effects.updateSchedulingGoalModelSpecification($model, goalSpecUpdate, user);
      }
    }
  }

  function onSelectAssociation(event: CustomEvent<Association>) {
    const { detail } = event;
    selectedAssociation = detail;
  }

  function onToggleSpecification(event: CustomEvent<{ id: number; selected: boolean }>) {
    const {
      detail: { id, selected },
    } = event;

    switch (selectedAssociation) {
      case 'condition':
        selectedConditionModelSpecifications = {
          ...selectedConditionModelSpecifications,
          [id]: {
            ...selectedConditionModelSpecifications[id],
            revision: selectedConditionModelSpecifications[id]?.revision ?? null,
            selected,
          },
        };
        break;
      case 'goal': {
        // find the next highest priority that is available to add
        const nextPriority = Object.keys(selectedGoalModelSpecifications).reduce(
          (prevPriority: number, selectedGoalModelSpecificationId) => {
            const goalSpecification = selectedGoalModelSpecifications[parseInt(selectedGoalModelSpecificationId)];
            if (goalSpecification.selected === true) {
              return prevPriority + 1;
            }
            return prevPriority;
          },
          0,
        );
        selectedGoalModelSpecifications = {
          ...selectedGoalModelSpecifications,
          [id]: {
            ...selectedGoalModelSpecifications[id],
            priority: nextPriority,
            revision: selectedGoalModelSpecifications[id]?.revision ?? null,
            selected,
          },
        };
        break;
      }
      case 'constraint':
      default:
        selectedConstraintModelSpecifications = {
          ...selectedConstraintModelSpecifications,
          [id]: {
            ...selectedConstraintModelSpecifications[id],
            revision: selectedConstraintModelSpecifications[id]?.revision ?? null,
            selected,
          },
        };
    }
  }

  function onUpdateSpecifications(event: CustomEvent<AssociationSpecification>) {
    const {
      detail: { id, priority, revision, selected },
    } = event;

    switch (selectedAssociation) {
      case 'condition':
        selectedConditionModelSpecifications = {
          ...selectedConditionModelSpecifications,
          [id]: {
            revision,
            selected,
          },
        };
        break;
      case 'goal': {
        const goalModelSpecificationsList = Object.keys(selectedGoalModelSpecifications)
          .reduce((prevSpecificationsList: AssociationSpecification[], key) => {
            const specificationId: number = parseInt(key);
            if (key !== `${id}`) {
              return [
                ...prevSpecificationsList,
                {
                  id: specificationId,
                  ...selectedGoalModelSpecifications[specificationId],
                },
              ];
            }

            return prevSpecificationsList;
          }, [])
          .sort((goalSpecA, goalSpecB) => {
            if (goalSpecA.priority != null && goalSpecB.priority != null) {
              return goalSpecA.priority - goalSpecB.priority;
            }
            return 0;
          });

        const prevPriority = selectedGoalModelSpecifications[id].priority ?? 0;
        const nextPriority = priority != null ? Math.min(priority, goalModelSpecificationsList.length) : 0;
        const priorityModifier = nextPriority < prevPriority ? 1 : -1;

        selectedGoalModelSpecifications = goalModelSpecificationsList
          .map(goalSpecification => {
            if (
              goalSpecification.selected &&
              goalSpecification.priority != null &&
              ((priorityModifier < 0 &&
                goalSpecification.priority >= prevPriority &&
                goalSpecification.priority <= nextPriority) ||
                (goalSpecification.priority <= prevPriority && goalSpecification.priority >= nextPriority))
            ) {
              return {
                ...goalSpecification,
                priority: goalSpecification.priority + priorityModifier,
              };
            }

            return goalSpecification;
          })
          .reduce(
            (prevGoalSpecificationMap: AssociationSpecificationMap, goalModelSpecification) => {
              return {
                ...prevGoalSpecificationMap,
                [goalModelSpecification.id]: {
                  priority: goalModelSpecification.priority,
                  revision: goalModelSpecification.revision,
                  selected: goalModelSpecification.selected,
                },
              };
            },
            {
              [id]: {
                priority: nextPriority,
                revision,
                selected,
              },
            },
          );
        break;
      }
      case 'constraint':
      default:
        selectedConstraintModelSpecifications = {
          ...selectedConstraintModelSpecifications,
          [id]: {
            revision,
            selected,
          },
        };
    }
  }

  function onViewMetadata(event: CustomEvent<number>) {
    const { detail: id } = event;

    switch (selectedAssociation) {
      case 'condition':
        window.open(`${base}/scheduling/conditions/edit/${id}?${SearchParameters.MODEL_ID}=${$model?.id}`);
        break;
      case 'goal':
        window.open(`${base}/scheduling/goals/edit/${id}?${SearchParameters.MODEL_ID}=${$model?.id}`);
        break;
      case 'constraint':
      default:
        window.open(`${base}/constraints/edit/${id}?${SearchParameters.MODEL_ID}=${$model?.id}`);
    }
  }
</script>

<PageTitle subTitle={data.initialModel.name} title="Models" />

<CssGrid columns="0.25fr 3px 1fr">
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Model info</SectionTitle>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <ModelForm
        initialModelDescription={$model?.description}
        initialModelName={$model?.name}
        initialModelOwner={$model?.owner}
        initialModelVersion={$model?.version}
        modelId={$model?.id}
        createdAt={$model?.created_at}
        user={data.user}
        on:createPlan={onCreatePlanWithModel}
        on:deleteModel={onDeleteModel}
        on:hasModelChanged={onModelMetadataChange}
      />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ModelAssociations
    {hasCreatePermission}
    {hasEditSpecPermission}
    {hasModelChanged}
    {metadataList}
    model={$model}
    {selectedAssociation}
    {selectedSpecifications}
    on:close={onClose}
    on:newMetadata={onNewMetadata}
    on:save={onSave}
    on:selectAssociation={onSelectAssociation}
    on:toggleSpecification={onToggleSpecification}
    on:updateSpecifications={onUpdateSpecifications}
    on:viewMetadata={onViewMetadata}
  />
</CssGrid>
