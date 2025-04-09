<svelte:options immutable={true} />

<script lang="ts" context="module">
  function isGoalSpecification(
    specification:
      | ConstraintModelSpecification
      | SchedulingGoalModelSpecification
      | SchedulingConditionModelSpecification,
  ): specification is SchedulingGoalModelSpecification {
    return !!(specification as SchedulingGoalModelSpecification).goal_metadata;
  }

  function isConditionSpecification(
    specification:
      | ConstraintModelSpecification
      | SchedulingGoalModelSpecification
      | SchedulingConditionModelSpecification,
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
    model: Model | null,
    modelKey: keyof Pick<
      Model,
      'constraint_specification' | 'scheduling_specification_conditions' | 'scheduling_specification_goals'
    >,
  ): Pick<BaseMetadata, 'id' | 'name' | 'owner' | 'public' | 'versions'>[] {
    return metadataSubscription.length
      ? metadataSubscription
      : (model?.[modelKey]
          .map(metadata => {
            if (isGoalSpecification(metadata)) {
              return createInitialMetadata(metadata.goal_metadata);
            } else if (isConditionSpecification(metadata)) {
              return createInitialMetadata(metadata.condition_metadata);
            }
            return createInitialMetadata(metadata.constraint_metadata);
          })
          .filter(filterEmpty) ?? []);
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
  import { onDestroy } from 'svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ModelAssociations from '../../../components/model/ModelAssociations.svelte';
  import ModelForm from '../../../components/model/ModelForm.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../../components/ui/CssGridGutter.svelte';
  import Panel from '../../../components/ui/Panel.svelte';
  import SectionTitle from '../../../components/ui/SectionTitle.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { constraints, constraintsMap, initialConstraintsLoading } from '../../../stores/constraints';
  import { initialModel, model, resetModelStores } from '../../../stores/model';
  import {
    schedulingConditionResponses,
    schedulingConditions,
    schedulingConditionsMap,
    schedulingGoalResponses,
    schedulingGoals,
    schedulingGoalsMap,
  } from '../../../stores/scheduling';
  import { initialUsersLoading, users } from '../../../stores/user';
  import { initialViewsLoading, views } from '../../../stores/views';
  import type { User, UserId } from '../../../types/app';
  import type {
    ConstraintMetadata,
    ConstraintModelSpecification,
    ConstraintModelSpecInsertInput,
    ConstraintModelSpecSetInput,
  } from '../../../types/constraint';
  import type {
    Association,
    AssociationSpecification,
    AssociationSpecificationMap,
    BaseMetadata,
    UpdatedAssociationSpecificationMap,
  } from '../../../types/metadata';
  import type { Model } from '../../../types/model';
  import type { Argument } from '../../../types/parameter';
  import type {
    SchedulingConditionMetadata,
    SchedulingConditionModelSpecification,
    SchedulingConditionModelSpecificationInsertInput,
    SchedulingConditionModelSpecificationSetInput,
    SchedulingGoalMetadata,
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
  let loading: boolean = true;
  let metadataList: Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[] = [];
  let modelMetadata: {
    default_view_id: number | null;
    description?: string;
    name: string;
    owner: UserId;
    version: string;
  } | null = null;
  let initialModelMetadata: {
    default_view_id: number | null;
    description?: string;
    name: string;
    owner: UserId;
    version: string;
  } | null = null;
  let selectedConstraintSpecificationMap: UpdatedAssociationSpecificationMap;
  let selectedConditionSpecificationMap: UpdatedAssociationSpecificationMap;
  let selectedGoalSpecificationMap: UpdatedAssociationSpecificationMap;
  let initialSelectedVisibleConstraintSpecificationsList: AssociationSpecification[] = [];
  let initialSelectedVisibleConditionSpecificationsList: AssociationSpecification[] = [];
  let initialSelectedVisibleGoalSpecificationsList: AssociationSpecification[] = [];
  let selectedConstraintMetadataMap: AssociationSpecificationMap;
  let selectedConditionMetadataMap: AssociationSpecificationMap;
  let selectedGoalMetadataMap: AssociationSpecificationMap;
  let selectedVisibleConstraintSpecificationsList: AssociationSpecification[] = [];
  let selectedVisibleConditionSpecificationsList: AssociationSpecification[] = [];
  let selectedVisibleGoalSpecificationsList: AssociationSpecification[] = [];
  let selectedMetadata: AssociationSpecificationMap = {};
  let selectedSpecificationsList: AssociationSpecification[] = [];
  let selectedAssociation: Association = 'constraint';
  let selectedNumberOfPrivateAssociations: number = 0;
  let user: User | null = null;
  let newConstraintCounter: number = 0;
  let newConditionCounter: number = 0;
  let newGoalCounter: number = 0;
  let numPrivateConstraints: number = 0;
  let numPrivateConditions: number = 0;
  let numPrivateGoals: number = 0;

  $: user = data.user;
  $: if (data.initialModel) {
    $initialModel = data.initialModel;
    model.updateValue(() => data.initialModel);
  }
  $: if ($model) {
    initialModelMetadata = {
      default_view_id: $model.default_view_id,
      description: $model.description,
      name: $model.name,
      owner: $model.owner,
      version: $model.version,
    };

    initialSelectedVisibleConditionSpecificationsList = $model.scheduling_specification_conditions
      .filter(schedulingConditionModelSpecification => {
        return schedulingConditionModelSpecification.condition_metadata !== null; // filter out the hidden conditions
      })
      .map(schedulingConditionModelSpecification => ({
        id: `${schedulingConditionModelSpecification.condition_id}`,
        metadata_id: (
          schedulingConditionModelSpecification.condition_metadata as Pick<SchedulingConditionMetadata, 'id' | 'name'>
        ).id,
        revision: schedulingConditionModelSpecification.condition_revision,
      }));
    numPrivateConditions =
      $model.scheduling_specification_conditions.length - initialSelectedVisibleConditionSpecificationsList.length;

    selectedConditionMetadataMap = initialSelectedVisibleConditionSpecificationsList.reduce(
      (currentSelectedMetadata, schedulingConditionModelSpecification) => {
        return {
          ...currentSelectedMetadata,
          [schedulingConditionModelSpecification.metadata_id]: true,
        };
      },
      {},
    );

    initialSelectedVisibleConstraintSpecificationsList = $model.constraint_specification
      .filter(constraintModelSpecification => {
        return constraintModelSpecification.constraint_metadata !== null; // filter out the hidden constraints
      })
      .map(constraintModelSpecification => ({
        arguments: constraintModelSpecification.arguments,
        id: `${constraintModelSpecification.invocation_id}`,
        metadata_id: (constraintModelSpecification.constraint_metadata as Pick<ConstraintMetadata, 'id' | 'name'>).id,
        priority: constraintModelSpecification.order,
        revision: constraintModelSpecification.constraint_revision,
      }));
    numPrivateConstraints =
      $model.constraint_specification.length - initialSelectedVisibleConstraintSpecificationsList.length;

    selectedConstraintMetadataMap = initialSelectedVisibleConstraintSpecificationsList.reduce(
      (currentSelectedMetadata, constraintModelSpecification) => {
        return {
          ...currentSelectedMetadata,
          [constraintModelSpecification.metadata_id]: true,
        };
      },
      {},
    );

    initialSelectedVisibleGoalSpecificationsList = $model.scheduling_specification_goals
      .filter(schedulingGoalModelSpecification => {
        return schedulingGoalModelSpecification.goal_metadata !== null; // filter out the hidden goals
      })
      .map(schedulingGoalModelSpecification => ({
        arguments: schedulingGoalModelSpecification.arguments,
        id: `${schedulingGoalModelSpecification.goal_invocation_id}`,
        metadata_id: (schedulingGoalModelSpecification.goal_metadata as Pick<SchedulingGoalMetadata, 'id' | 'name'>).id,
        priority: schedulingGoalModelSpecification.priority,
        revision: schedulingGoalModelSpecification.goal_revision,
      }));
    numPrivateGoals =
      $model.scheduling_specification_goals.length - initialSelectedVisibleGoalSpecificationsList.length;

    selectedGoalMetadataMap = initialSelectedVisibleGoalSpecificationsList.reduce(
      (currentSelectedMetadata, schedulingGoalModelSpecification) => {
        return {
          ...currentSelectedMetadata,
          [schedulingGoalModelSpecification.metadata_id]: true,
        };
      },
      {},
    );

    modelMetadata = { ...initialModelMetadata };

    selectedVisibleConditionSpecificationsList = [...initialSelectedVisibleConditionSpecificationsList];
    selectedVisibleConstraintSpecificationsList = [...initialSelectedVisibleConstraintSpecificationsList];
    selectedVisibleGoalSpecificationsList = [...initialSelectedVisibleGoalSpecificationsList];
  }

  $: switch (selectedAssociation) {
    case 'goal': {
      loading = !$schedulingGoalResponses;
      hasCreatePermission = featurePermissions.schedulingGoals.canCreate(user);
      hasEditSpecPermission = featurePermissions.schedulingGoalsModelSpec.canUpdate(user);
      metadataList = getMetadata($schedulingGoals, $model, 'scheduling_specification_goals').filter(goalMetadata =>
        isMetadataViewable(goalMetadata, user),
      );

      selectedMetadata = selectedGoalMetadataMap;
      selectedSpecificationsList = selectedVisibleGoalSpecificationsList;
      selectedNumberOfPrivateAssociations = numPrivateGoals;
      break;
    }
    case 'condition':
      loading = !$schedulingConditionResponses;
      hasCreatePermission = featurePermissions.schedulingConditions.canCreate(user);
      hasEditSpecPermission = featurePermissions.schedulingConditionsModelSpec.canUpdate(user);
      metadataList = getMetadata($schedulingConditions, $model, 'scheduling_specification_conditions').filter(
        conditionMetadata => isMetadataViewable(conditionMetadata, user),
      );

      selectedMetadata = selectedConditionMetadataMap;
      selectedSpecificationsList = selectedVisibleConditionSpecificationsList;
      selectedNumberOfPrivateAssociations = numPrivateConditions;
      break;
    case 'constraint':
    default: {
      loading = $initialConstraintsLoading;
      hasCreatePermission = featurePermissions.constraints.canCreate(user);
      hasEditSpecPermission = featurePermissions.constraintsModelSpec.canUpdate(user);
      metadataList = getMetadata($constraints || [], $model, 'constraint_specification');

      selectedMetadata = selectedConstraintMetadataMap;
      selectedSpecificationsList = selectedVisibleConstraintSpecificationsList;
      selectedNumberOfPrivateAssociations = numPrivateConstraints;
    }
  }

  $: {
    let lastPriority = -1;
    selectedVisibleGoalSpecificationsList = selectedVisibleGoalSpecificationsList
      .sort((specificationA, specificationB) => {
        return (specificationA?.priority ?? 0) - (specificationB?.priority ?? 0);
      })
      .map(goalSpecification => {
        if (goalSpecification.priority ?? 0 - lastPriority > 1) {
          lastPriority = lastPriority + 1;
          return {
            ...goalSpecification,
            priority: lastPriority,
          };
        }
        lastPriority = goalSpecification.priority ?? 0;
        return goalSpecification;
      });
    selectedGoalSpecificationMap = selectedVisibleGoalSpecificationsList.reduce(
      (currentSelectedSpecificationMap, schedulingGoalModelSpecification) => {
        return {
          ...currentSelectedSpecificationMap,
          [schedulingGoalModelSpecification.id]: true,
        };
      },
      {},
    );
  }
  $: {
    let lastPriority = -1;
    selectedVisibleConstraintSpecificationsList = selectedVisibleConstraintSpecificationsList
      .sort((specificationA, specificationB) => {
        return (specificationA?.priority ?? 0) - (specificationB?.priority ?? 0);
      })
      .map(constraintSpecification => {
        if (constraintSpecification.priority ?? 0 - lastPriority > 1) {
          lastPriority = lastPriority + 1;
          return {
            ...constraintSpecification,
            priority: lastPriority,
          };
        }
        lastPriority = constraintSpecification.priority ?? 0;
        return constraintSpecification;
      });
    selectedConstraintSpecificationMap = selectedVisibleConstraintSpecificationsList.reduce(
      (currentSelectedSpecificationMap, constraintModelSpecification) => {
        return {
          ...currentSelectedSpecificationMap,
          [constraintModelSpecification.id]: true,
        };
      },
      {},
    );
  }
  $: {
    selectedConditionSpecificationMap = selectedVisibleConditionSpecificationsList.reduce(
      (currentSelectedSpecificationMap, schedulingConditionModelSpecification) => {
        return {
          ...currentSelectedSpecificationMap,
          [schedulingConditionModelSpecification.id]: true,
        };
      },
      {},
    );
  }

  $: hasModelChanged =
    JSON.stringify(initialModelMetadata) !== JSON.stringify(modelMetadata) ||
    JSON.stringify(initialSelectedVisibleConditionSpecificationsList) !==
      JSON.stringify(selectedVisibleConditionSpecificationsList) ||
    JSON.stringify(initialSelectedVisibleConstraintSpecificationsList) !==
      JSON.stringify(selectedVisibleConstraintSpecificationsList) ||
    JSON.stringify(initialSelectedVisibleGoalSpecificationsList) !==
      JSON.stringify(selectedVisibleGoalSpecificationsList);

  onDestroy(() => {
    resetModelStores();
  });

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
      default_view_id: number | null;
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
        constraintModelSpecsToAdd: ConstraintModelSpecInsertInput[];
        constraintModelSpecsToUpdate: ConstraintModelSpecSetInput[];
      } = selectedVisibleConstraintSpecificationsList.reduce(
        (
          prevConstraintPlanSpecUpdates: {
            constraintModelSpecsToAdd: ConstraintModelSpecInsertInput[];
            constraintModelSpecsToUpdate: ConstraintModelSpecSetInput[];
          },
          constraintSpecification: AssociationSpecification,
        ) => {
          const constraintSpecificationId = constraintSpecification.id;
          if (/new/.test(constraintSpecificationId)) {
            const constraintMetadata = $constraintsMap[constraintSpecification.metadata_id];
            return {
              ...prevConstraintPlanSpecUpdates,
              constraintModelSpecsToAdd: [
                ...prevConstraintPlanSpecUpdates.constraintModelSpecsToAdd,
                {
                  arguments: constraintSpecification.arguments,
                  constraint_id: constraintMetadata.id,
                  constraint_revision: constraintSpecification.revision,
                  model_id: $model?.id,
                  order: constraintSpecification.priority,
                } as ConstraintModelSpecInsertInput,
              ],
            };
          } else {
            return {
              ...prevConstraintPlanSpecUpdates,
              constraintModelSpecsToUpdate: [
                ...prevConstraintPlanSpecUpdates.constraintModelSpecsToUpdate,
                {
                  arguments: constraintSpecification.arguments,
                  constraint_revision: constraintSpecification.revision,
                  invocation_id: parseInt(constraintSpecification.id),
                  order: constraintSpecification.priority,
                } as ConstraintModelSpecSetInput,
              ],
            };
          }
        },
        {
          constraintModelSpecsToAdd: [],
          constraintModelSpecsToUpdate: [],
        },
      );
      const constraintInvocationIdsToDelete = initialSelectedVisibleConstraintSpecificationsList.reduce(
        (prevConstraintIdsToDelete: number[], constraintSpecification: AssociationSpecification) => {
          if (!selectedConstraintSpecificationMap[constraintSpecification.id]) {
            return [...prevConstraintIdsToDelete, parseInt(constraintSpecification.id)];
          }
          return prevConstraintIdsToDelete;
        },
        [],
      );
      await effects.updateConstraintModelSpecifications(
        constraintModelSpecUpdates.constraintModelSpecsToAdd,
        constraintInvocationIdsToDelete,
        user,
      );

      for (let i = 0; i < constraintModelSpecUpdates.constraintModelSpecsToUpdate.length; i++) {
        const constraintSpecToUpdate = constraintModelSpecUpdates.constraintModelSpecsToUpdate[i];

        await effects.updateConstraintModelSpecification(constraintSpecToUpdate, user);
      }

      const conditionModelSpecUpdates: (
        | SchedulingConditionModelSpecificationInsertInput
        | SchedulingConditionModelSpecificationSetInput
      )[] = selectedVisibleConditionSpecificationsList.reduce(
        (
          prevConditionPlanSpecUpdates: (
            | SchedulingConditionModelSpecificationInsertInput
            | SchedulingConditionModelSpecificationSetInput
          )[],
          conditionSpecification: AssociationSpecification,
        ) => {
          const conditionSpecificationId = conditionSpecification.id;
          const conditionMetadata = $schedulingConditionsMap[conditionSpecification.metadata_id];
          if (/new/.test(conditionSpecificationId)) {
            return [
              ...prevConditionPlanSpecUpdates,
              {
                condition_id: conditionMetadata.id,
                condition_revision: conditionSpecification.revision,
                model_id: $model?.id,
              } as SchedulingConditionModelSpecificationInsertInput,
            ];
          } else {
            return [
              ...prevConditionPlanSpecUpdates,
              {
                condition_id: conditionMetadata.id,
                condition_revision: conditionSpecification.revision,
                model_id: $model?.id,
              } as SchedulingConditionModelSpecificationSetInput,
            ];
          }
        },
        [],
      );
      const conditionIdsToDelete = initialSelectedVisibleConditionSpecificationsList.reduce(
        (prevConditionIdsToDelete: number[], conditionSpecification: AssociationSpecification) => {
          if (!selectedConditionSpecificationMap[conditionSpecification.id]) {
            return [...prevConditionIdsToDelete, parseInt(conditionSpecification.id)];
          }
          return prevConditionIdsToDelete;
        },
        [],
      );
      await effects.updateSchedulingConditionModelSpecifications(
        $model,
        conditionModelSpecUpdates,
        conditionIdsToDelete,
        user,
      );
      const goalModelSpecUpdates: {
        goalModelSpecsToAdd: SchedulingGoalModelSpecificationInsertInput[];
        goalModelSpecsToUpdate: SchedulingGoalModelSpecificationSetInput[];
      } = selectedVisibleGoalSpecificationsList.reduce(
        (
          prevGoalPlanSpecUpdates: {
            goalModelSpecsToAdd: SchedulingGoalModelSpecificationInsertInput[];
            goalModelSpecsToUpdate: SchedulingGoalModelSpecificationSetInput[];
          },
          goalSpecification: AssociationSpecification,
        ) => {
          const goalSpecificationId = goalSpecification.id;
          if (/new/.test(goalSpecificationId)) {
            const goalMetadata = $schedulingGoalsMap[goalSpecification.metadata_id];
            return {
              ...prevGoalPlanSpecUpdates,
              goalModelSpecsToAdd: [
                ...prevGoalPlanSpecUpdates.goalModelSpecsToAdd,
                {
                  arguments: goalSpecification.arguments,
                  goal_id: goalMetadata.id,
                  goal_revision: goalSpecification.revision,
                  model_id: $model?.id,
                  priority: goalSpecification.priority,
                } as SchedulingGoalModelSpecificationInsertInput,
              ],
            };
          } else {
            return {
              ...prevGoalPlanSpecUpdates,
              goalModelSpecsToUpdate: [
                ...prevGoalPlanSpecUpdates.goalModelSpecsToUpdate,
                {
                  arguments: goalSpecification.arguments,
                  goal_invocation_id: parseInt(goalSpecification.id),
                  goal_revision: goalSpecification.revision,
                  priority: goalSpecification.priority,
                } as SchedulingGoalModelSpecificationSetInput,
              ],
            };
          }
        },
        {
          goalModelSpecsToAdd: [],
          goalModelSpecsToUpdate: [],
        },
      );
      const goalInvocationIdsToDelete = initialSelectedVisibleGoalSpecificationsList.reduce(
        (prevGoalIdsToDelete: number[], goalSpecification: AssociationSpecification) => {
          if (!selectedGoalSpecificationMap[goalSpecification.id]) {
            return [...prevGoalIdsToDelete, parseInt(goalSpecification.id)];
          }
          return prevGoalIdsToDelete;
        },
        [],
      );
      await effects.updateSchedulingGoalModelSpecifications(
        goalModelSpecUpdates.goalModelSpecsToAdd,
        goalInvocationIdsToDelete,
        user,
      );

      for (let i = 0; i < goalModelSpecUpdates.goalModelSpecsToUpdate.length; i++) {
        const goalSpecUpdate = goalModelSpecUpdates.goalModelSpecsToUpdate[i];
        await effects.updateSchedulingGoalModelSpecification(goalSpecUpdate, user);
      }
    }
  }

  function onSelectAssociation(event: CustomEvent<Association>) {
    const { detail } = event;
    selectedAssociation = detail;
  }

  function onToggleSpecification(event: CustomEvent<{ metadataId: number; selected: boolean }>) {
    const {
      detail: { metadataId, selected },
    } = event;

    // this should pragmatically always be found since you can't select what isn't shown
    const toggledMetadata = metadataList.find(({ id }) => metadataId === id) as Pick<
      BaseMetadata,
      'id' | 'name' | 'public' | 'versions'
    >;

    switch (selectedAssociation) {
      case 'condition': {
        if (selected) {
          selectedVisibleConditionSpecificationsList = [
            ...selectedVisibleConditionSpecificationsList,
            {
              ...toggledMetadata,
              id: `new${newConditionCounter}`,
              metadata_id: metadataId,
              revision: null,
            },
          ];

          newConditionCounter++;
        } else {
          selectedVisibleConditionSpecificationsList = selectedVisibleConditionSpecificationsList.filter(
            conditionSpecification => conditionSpecification.metadata_id !== metadataId,
          );
        }

        selectedConditionMetadataMap = {
          ...selectedConditionMetadataMap,
          [metadataId]: selected,
        };
        break;
      }
      case 'goal': {
        if (selected) {
          selectedVisibleGoalSpecificationsList = [
            ...selectedVisibleGoalSpecificationsList,
            {
              ...toggledMetadata,
              id: `new${newGoalCounter}`,
              metadata_id: metadataId,
              priority:
                (selectedVisibleGoalSpecificationsList[selectedVisibleGoalSpecificationsList.length - 1]?.priority ??
                  -1) + 1,
              revision: null,
            },
          ];
          newGoalCounter++;
        } else {
          selectedVisibleGoalSpecificationsList = selectedVisibleGoalSpecificationsList.filter(
            goalSpecification => goalSpecification.metadata_id !== metadataId,
          );
        }

        selectedGoalMetadataMap = {
          ...selectedGoalMetadataMap,
          [metadataId]: selected,
        };
        break;
      }
      case 'constraint':
      default: {
        if (selected) {
          selectedVisibleConstraintSpecificationsList = [
            ...selectedVisibleConstraintSpecificationsList,
            {
              ...toggledMetadata,
              id: `new${newConstraintCounter}`,
              metadata_id: metadataId,
              priority:
                (selectedVisibleConstraintSpecificationsList[selectedVisibleConstraintSpecificationsList.length - 1]
                  ?.priority ?? -1) + 1,
              revision: null,
            },
          ];

          newConstraintCounter++;
        } else {
          selectedVisibleConstraintSpecificationsList = selectedVisibleConstraintSpecificationsList.filter(
            constraintSpecification => constraintSpecification.metadata_id !== metadataId,
          );
        }

        selectedConstraintMetadataMap = {
          ...selectedConstraintMetadataMap,
          [metadataId]: selected,
        };
      }
    }
  }

  function onUpdateSpecifications(
    event: CustomEvent<{ arguments?: Argument; id: string; priority?: number; revision?: number | null }>,
  ) {
    const {
      detail: { arguments: argsToUpdate, id, priority, revision },
    } = event;
    switch (selectedAssociation) {
      case 'condition':
        selectedVisibleConditionSpecificationsList = selectedVisibleConditionSpecificationsList.map(
          conditionSpecification => {
            if (id === conditionSpecification.id) {
              return {
                ...conditionSpecification,
                revision: revision !== undefined ? revision : conditionSpecification.revision,
              };
            }
            return conditionSpecification;
          },
        );
        break;
      case 'goal': {
        const prevPriority =
          selectedVisibleGoalSpecificationsList.find(goalSpecification => goalSpecification.id === id)?.priority ?? 0;
        const nextPriority = priority != null ? Math.min(priority, selectedVisibleGoalSpecificationsList.length) : 0;
        const priorityModifier = nextPriority < prevPriority ? 1 : -1;

        selectedVisibleGoalSpecificationsList = selectedVisibleGoalSpecificationsList.map(goalSpecification => {
          if (id === goalSpecification.id) {
            return {
              ...goalSpecification,
              arguments: argsToUpdate ?? goalSpecification.arguments,
              priority: priority ?? goalSpecification.priority,
              revision: revision !== undefined ? revision : goalSpecification.revision,
            };
          }
          if (
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
        });
        break;
      }
      case 'constraint':
      default: {
        const prevPriority =
          selectedVisibleConstraintSpecificationsList.find(constraintSpecification => constraintSpecification.id === id)
            ?.priority ?? 0;
        const nextPriority =
          priority != null ? Math.min(priority, selectedVisibleConstraintSpecificationsList.length) : 0;
        const priorityModifier = nextPriority < prevPriority ? 1 : -1;

        selectedVisibleConstraintSpecificationsList = selectedVisibleConstraintSpecificationsList.map(
          constraintSpecification => {
            if (id === constraintSpecification.id) {
              return {
                ...constraintSpecification,
                arguments: argsToUpdate ?? constraintSpecification.arguments,
                priority: priority ?? constraintSpecification.priority,
                revision: revision !== undefined ? revision : constraintSpecification.revision,
              };
            }
            if (
              constraintSpecification.priority != null &&
              ((priorityModifier < 0 &&
                constraintSpecification.priority >= prevPriority &&
                constraintSpecification.priority <= nextPriority) ||
                (constraintSpecification.priority <= prevPriority && constraintSpecification.priority >= nextPriority))
            ) {
              return {
                ...constraintSpecification,
                priority: constraintSpecification.priority + priorityModifier,
              };
            }

            return constraintSpecification;
          },
        );
      }
    }
  }

  function onDuplicateInvocation(event: CustomEvent<{ id: string }>) {
    const {
      detail: { id },
    } = event;

    switch (selectedAssociation) {
      case 'condition': {
        // do nothing because condition specifications cannot be duplicated
        break;
      }
      case 'goal': {
        const goalSpecificationToDuplicate = selectedVisibleGoalSpecificationsList.find(
          goalSpecification => goalSpecification.id === id,
        )!; // This should pragmatically always exist

        selectedVisibleGoalSpecificationsList = [
          ...selectedVisibleGoalSpecificationsList,
          {
            ...goalSpecificationToDuplicate,
            id: `new${newGoalCounter}`,
            priority: goalSpecificationToDuplicate.priority! + 1,
          },
        ];

        newGoalCounter++;
        break;
      }
      case 'constraint':
      default: {
        const constraintSpecificationToDuplicate = selectedVisibleConstraintSpecificationsList.find(
          constraintSpecification => constraintSpecification.id === id,
        )!; // This should pragmatically always exist

        selectedVisibleConstraintSpecificationsList = [
          ...selectedVisibleConstraintSpecificationsList,
          {
            ...constraintSpecificationToDuplicate,
            id: `new${newConstraintCounter}`,
            priority: constraintSpecificationToDuplicate.priority! + 1,
          },
        ];

        newConstraintCounter++;
      }
    }
  }

  function onDeleteInvocation(event: CustomEvent<{ id: string }>) {
    const {
      detail: { id },
    } = event;

    switch (selectedAssociation) {
      case 'condition': {
        // do nothing because condition specifications cannot be duplicated
        break;
      }
      case 'goal': {
        selectedVisibleGoalSpecificationsList = selectedVisibleGoalSpecificationsList.filter(
          goalSpecification => goalSpecification.id !== id,
        );
        break;
      }
      case 'constraint':
      default: {
        selectedVisibleConstraintSpecificationsList = selectedVisibleConstraintSpecificationsList.filter(
          constraintSpecification => constraintSpecification.id !== id,
        );
      }
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
        initialModelDefaultViewId={$model?.default_view_id}
        activityTypeLogs={$model?.refresh_activity_type_logs}
        modelParameterLogs={$model?.refresh_model_parameter_logs}
        resourceTypeLogs={$model?.refresh_resource_type_logs}
        modelId={$model?.id}
        createdAt={$model?.created_at}
        user={data.user}
        users={$users}
        usersLoading={$initialUsersLoading}
        views={$views}
        viewsLoading={$initialViewsLoading}
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
    {loading}
    {metadataList}
    model={$model}
    numOfPrivateAssociations={selectedNumberOfPrivateAssociations}
    {selectedAssociation}
    selectedSpecifications={selectedMetadata}
    {selectedSpecificationsList}
    on:close={onClose}
    on:newMetadata={onNewMetadata}
    on:save={onSave}
    on:selectAssociation={onSelectAssociation}
    on:toggleSpecification={onToggleSpecification}
    on:updateSpecifications={onUpdateSpecifications}
    on:viewMetadata={onViewMetadata}
    on:duplicateInvocation={onDuplicateInvocation}
    on:deleteInvocation={onDeleteInvocation}
  />
</CssGrid>
