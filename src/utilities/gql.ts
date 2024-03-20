/**
 * GraphQL Query, Mutation, and Subscription strings.
 */
const gql = {
  APPLY_PRESET_TO_ACTIVITY: `#graphql
    mutation ApplyPresetToActivity($presetId: Int!, $activityId: Int!, $planId: Int!) {
      apply_preset_to_activity(args: {
        _preset_id: $presetId,
        _activity_id: $activityId,
        _plan_id: $planId
      }) {
        id
      }
    }
  `,

  CANCEL_SCHEDULING_REQUEST: `#graphql
    mutation CancelSchedulingRequest($id: Int!) {
      update_scheduling_request(where: { analysis_id: { _eq: $id } }, _set: {
        canceled: true
      }) {
        affected_rows
      }
    }
  `,

  CANCEL_SIMULATION: `#graphql
    mutation CancelSim($id: Int!) {
      update_simulation_dataset_by_pk(pk_columns: {id: $id}, _set: {
        canceled: true
      }) {
        id
      }
    }
  `,

  CHECK_CONSTRAINTS: `#graphql
    query CheckConstraints($planId: Int!) {
      constraintResponses: constraintViolations(planId: $planId) {
        success
        constraintId
        constraintName
        constraintRevision
        results {
          resourceIds
          gaps {
            end
            start
          }
          violations {
            activityInstanceIds
            windows {
              end
              start
            }
          }
        }
        errors {
          message
          stack
          location {
            column
            line
          }
        }
      }
    }
  `,

  CREATE_ACTIVITY_DIRECTIVE: `#graphql
    mutation CreateActivityDirective($activityDirectiveInsertInput: activity_directive_insert_input!) {
      insert_activity_directive_one(object: $activityDirectiveInsertInput) {
        anchor_id
        anchored_to_start
        arguments
        created_at
        id
        last_modified_arguments_at
        last_modified_at
        metadata
        name
        plan_id
        source_scheduling_goal_id
        start_offset
        tags {
          tag {
            color
            id
            name
          }
        }
        type
      }
    }
  `,

  CREATE_ACTIVITY_DIRECTIVE_TAGS: `#graphql
    mutation CreateActivityDirectiveTags($tags: [activity_directive_tags_insert_input!]!) {
      insert_activity_directive_tags(objects: $tags, on_conflict: {
        constraint: activity_directive_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_ACTIVITY_PRESET: `#graphql
    mutation CreateActivityPreset($activityPresetInsertInput: activity_presets_insert_input!) {
      insert_activity_presets_one(object: $activityPresetInsertInput) {
        arguments
        associated_activity_type
        id
        model_id
        name
        owner
      }
    }
  `,

  CREATE_COMMAND_DICTIONARY: `#graphql
    mutation CreateCommandDictionary($dictionary: String!) {
      createCommandDictionary: uploadDictionary(dictionary: $dictionary) {
        command_types_typescript_path
        created_at
        id
        mission
        version
      }
    }
  `,

  CREATE_CONSTRAINT: `#graphql
    mutation CreateConstraint($constraint: constraint_metadata_insert_input!) {
      constraint: insert_constraint_metadata_one(object: $constraint) {
        id
        name
        description
        owner
        public
        tags {
          tag_id
        }
        versions {
          revision
          definition
          tags {
            tag_id
          }
        }
      }
    }
  `,

  CREATE_CONSTRAINT_DEFINITION: `#graphql
    mutation CreateConstraintDefinition($constraintDefinition: constraint_definition_insert_input!) {
      constraintDefinition: insert_constraint_definition_one(object: $constraintDefinition) {
        constraint_id
        definition
        revision
      }
    }
  `,

  CREATE_CONSTRAINT_MODEL_SPECIFICATION: `#graphql
    mutation CreateConstraintModelSpecification($constraintModelSpecification: constraint_model_specification_insert_input!) {
      constraintModelSpecification: insert_constraint_model_specification_one(object: $constraintModelSpecification) {
        constraint_id
        constraint_revision
        model_id
      }
    }
  `,

  CREATE_EXPANSION_RULE: `#graphql
    mutation CreateExpansionRule($rule: expansion_rule_insert_input!) {
      createExpansionRule: insert_expansion_rule_one(object: $rule) {
        id
      }
    }
  `,

  CREATE_EXPANSION_RULE_TAGS: `#graphql
    mutation CreateExpansionRuleTags($tags: [expansion_rule_tags_insert_input!]!) {
      insert_expansion_rule_tags(objects: $tags, on_conflict: {
        constraint: expansion_rule_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_EXPANSION_SEQUENCE: `#graphql
    mutation CreateExpansionSequence($sequence: sequence_insert_input!) {
      createExpansionSequence: insert_sequence_one(object: $sequence) {
        seq_id
      }
    }
  `,

  CREATE_EXPANSION_SET: `#graphql
    mutation CreateExpansionSet($dictionaryId: Int!, $modelId: Int!, $expansionRuleIds: [Int!]!, $name: String,  $description: String) {
      createExpansionSet(
        commandDictionaryId: $dictionaryId,
        missionModelId: $modelId,
        expansionIds: $expansionRuleIds,
        name: $name,
        description: $description
      ) {
        id
      }
    }
  `,

  CREATE_MODEL: `#graphql
    mutation CreateModel($model: mission_model_insert_input!) {
      createModel: insert_mission_model_one(object: $model) {
        id
        created_at
        owner
      }
    }
  `,

  CREATE_PLAN: `#graphql
    mutation CreatePlan($plan: plan_insert_input!) {
      createPlan: insert_plan_one(object: $plan) {
        created_at
        collaborators {
          collaborator
        }
        duration
        id
        owner
        revision
        start_time
        updated_at
        updated_by
      }
    }
  `,

  CREATE_PLAN_MERGE_REQUEST: `#graphql
    mutation CreatePlanMergeRequest($source_plan_id: Int!, $target_plan_id: Int!) {
      create_merge_request(args: { source_plan_id: $source_plan_id, target_plan_id: $target_plan_id }) {
        merge_request_id
      }
    }
  `,

  CREATE_PLAN_SNAPSHOT: `#graphql
    mutation CreatePlanSnapshot($plan_id: Int!, $snapshot_name: String!, $description: String!) {
      createSnapshot: create_snapshot(args: { _plan_id: $plan_id, _snapshot_name: $snapshot_name, _description: $description } ) {
        snapshot_id
      }
    }
  `,

  CREATE_PLAN_SNAPSHOT_TAGS: `#graphql
    mutation CreatePlanSnapshotTags($tags: [plan_snapshot_tags_insert_input!]!) {
      insert_plan_snapshot_tags(objects: $tags, on_conflict: {
        constraint: plan_snapshot_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_PLAN_TAGS: `#graphql
    mutation CreatePlanTags($tags: [plan_tags_insert_input!]!) {
      insert_plan_tags(objects: $tags, on_conflict: {
        constraint: plan_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_SCHEDULING_CONDITION: `#graphql
    mutation CreateSchedulingCondition($condition: scheduling_condition_metadata_insert_input!) {
      createSchedulingCondition: insert_scheduling_condition_metadata_one(object: $condition) {
        id
        name
        description
        owner
        public
        tags {
          tag_id
        }
        versions {
          revision
          definition
          tags {
            tag_id
          }
        }
      }
    }
  `,

  CREATE_SCHEDULING_CONDITION_DEFINITION: `#graphql
    mutation CreateSchedulingConditionDefinition($conditionDefinition: scheduling_condition_definition_insert_input!) {
      conditionDefinition: insert_scheduling_condition_definition_one(object: $conditionDefinition) {
        condition_id
        definition
        revision
      }
    }
  `,

  CREATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION: `#graphql
    mutation CreateSchedulingSpecCondition($spec_condition: scheduling_specification_conditions_insert_input!) {
      createSchedulingSpecCondition: insert_scheduling_specification_conditions_one(object: $spec_condition) {
        enabled
        condition_id
        specification_id
      }
    }
  `,

  CREATE_SCHEDULING_GOAL: `#graphql
    mutation CreateSchedulingGoal($goal: scheduling_goal_metadata_insert_input!) {
      createSchedulingGoal: insert_scheduling_goal_metadata_one(object: $goal) {
        id
        name
        description
        owner
        public
        tags {
          tag_id
        }
        versions {
          revision
          definition
          tags {
            tag_id
          }
        }
      }
    }
  `,

  CREATE_SCHEDULING_GOAL_DEFINITION: `#graphql
    mutation CreateSchedulingGoalDefinition($goalDefinition: scheduling_goal_definition_insert_input!) {
      goalDefinition: insert_scheduling_goal_definition_one(object: $goalDefinition) {
        goal_id
        definition
        revision
      }
    }
  `,

  CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION: `#graphql
    mutation CreateSchedulingSpecGoal($spec_goal: scheduling_specification_goals_insert_input!) {
      createSchedulingSpecGoal: insert_scheduling_specification_goals_one(object: $spec_goal) {
        enabled
        goal_id
        priority
        specification_id
      }
    }
  `,

  CREATE_SCHEDULING_PLAN_SPECIFICATION: `#graphql
    mutation CreateSchedulingSpec($spec: scheduling_specification_insert_input!) {
      createSchedulingSpec: insert_scheduling_specification_one(object: $spec) {
        id
      }
    }
  `,

  CREATE_SIMULATION_TEMPLATE: `#graphql
    mutation CreateSimulationTemplate($simulationTemplateInsertInput: simulation_template_insert_input!) {
      insert_simulation_template_one(object: $simulationTemplateInsertInput) {
        arguments
        description
        id
      }
    }
  `,

  CREATE_TAG: `#graphql
    mutation CreateTag($tag: tags_insert_input!) {
      insert_tags_one(object: $tag) {
        color
        created_at
        id
        name
        owner
      }
    }
  `,

  CREATE_TAGS: `#graphql
    mutation CreateTags($tags: [tags_insert_input!]!) {
      insert_tags(objects: $tags, on_conflict: {
        constraint: tags_name_key,
        update_columns: [color]
      }) {
        affected_rows
        returning {
          color
          created_at
          id
          name
          owner
        }
      }
    }
  `,

  CREATE_USER_SEQUENCE: `#graphql
    mutation CreateUserSequence($sequence: user_sequence_insert_input!) {
      createUserSequence: insert_user_sequence_one(object: $sequence) {
        id
      }
    }
  `,

  CREATE_VIEW: `#graphql
    mutation CreateView($view: view_insert_input!) {
      newView: insert_view_one(object: $view) {
        created_at
        definition
        id
        name
        owner
        updated_at
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES: `#graphql
    mutation DeleteActivityDirectives($plan_id: Int!, $activity_ids: [Int!]!) {
      deleteActivityDirectives: delete_activity_directive(
        where: { id: { _in: $activity_ids }, _and: { plan_id: { _eq: $plan_id } } }
      ) {
        returning {
          id
        }
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_PLAN_START: `#graphql
    mutation DeleteActivityDirectivesReanchorPlanStart($plan_id: Int!, $activity_ids: _int4!) {
      delete_activity_by_pk_reanchor_plan_start_bulk(args: { _plan_id: $plan_id, _activity_ids: $activity_ids }) {
        change_type
        affected_row
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR: `#graphql
    mutation DeleteActivityDirectivesReanchorToAnchor($plan_id: Int!, $activity_ids: _int4!) {
      delete_activity_by_pk_reanchor_to_anchor_bulk(args: { _plan_id: $plan_id, _activity_ids: $activity_ids }) {
        change_type
        affected_row
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES_SUBTREE: `#graphql
    mutation DeleteActivityDirectivesSubtree($plan_id: Int!, $activity_ids: _int4!) {
      delete_activity_by_pk_delete_subtree_bulk(args: { _plan_id: $plan_id, _activity_ids: $activity_ids }) {
        change_type
        affected_row
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVE_TAGS: `#graphql
    mutation DeleteActivityDirectivesTags($ids: [Int!]!) {
        delete_activity_directive_tags(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_ACTIVITY_PRESET: `#graphql
    mutation DeleteActivityPreset($id: Int!) {
      deleteActivityPreset: delete_activity_presets_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_COMMAND_DICTIONARY: `#graphql
    mutation DeleteCommandDictionary($id: Int!) {
      deleteCommandDictionary: delete_command_dictionary_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_CONSTRAINT_METADATA: `#graphql
    mutation DeleteConstraint($id: Int!) {
      deleteConstraintMetadata: delete_constraint_metadata_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_CONSTRAINT_METADATA_TAGS: `#graphql
    mutation DeleteConstraintMetadataTags($ids: [Int!]!) {
      delete_constraint_tags(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_CONSTRAINT_MODEL_SPECIFICATIONS: `#graphql
    mutation DeleteConstraintModelSpecification($constraintIds: [Int!]!, $modelId: Int!) {
      delete_constraint_model_specification(
        where: {
          constraint_id: { _in: $constraintIds },
          _and: {
            model_id: { _eq: $modelId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  DELETE_CONSTRAINT_PLAN_SPECIFICATIONS: `#graphql
    mutation DeleteConstraintPlanSpecification($constraintIds: [Int!]!, $planId: Int!) {
      delete_constraint_specification(
        where: {
          constraint_id: { _in: $constraintIds },
          _and: {
            plan_id: { _eq: $planId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  DELETE_EXPANSION_RULE: `#graphql
    mutation DeleteExpansionRule($id: Int!) {
      deleteExpansionRule: delete_expansion_rule_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_EXPANSION_RULE_TAGS: `#graphql
    mutation DeleteExpansionRuleTags($ids: [Int!]!) {
        delete_expansion_rule_tags(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_EXPANSION_SEQUENCE: `#graphql
    mutation DeleteExpansionSequence($seqId: String!, $simulationDatasetId: Int!) {
      deleteExpansionSequence: delete_sequence_by_pk(seq_id: $seqId, simulation_dataset_id: $simulationDatasetId) {
        seq_id
      }
    }
  `,

  DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY: `#graphql
    mutation DeleteExpansionSequenceToActivity($simulation_dataset_id: Int!, $simulated_activity_id: Int!) {
      expansionSequence: delete_sequence_to_simulated_activity_by_pk(
        simulation_dataset_id: $simulation_dataset_id,
        simulated_activity_id: $simulated_activity_id
      ) {
        seq_id
      }
    }
  `,

  DELETE_EXPANSION_SET: `#graphql
    mutation DeleteExpansionSet($id: Int!) {
      deleteExpansionSet: delete_expansion_set_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_MODEL: `#graphql
    mutation DeleteModel($id: Int!) {
      deleteModel: delete_mission_model_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_PLAN: `#graphql
    mutation DeletePlan($id: Int!) {
      deletePlan: delete_plan_by_pk(id: $id) {
        id
      }
      deleteSchedulingSpec: delete_scheduling_specification(where: { plan_id: { _eq: $id } }) {
        returning {
          id
        }
      }
    }
  `,

  DELETE_PLAN_SNAPSHOT: `#graphql
    mutation DeletePlanSnapshot($snapshot_id: Int!) {
      deletePlanSnapshot: delete_plan_snapshot_by_pk(snapshot_id: $snapshot_id) {
        snapshot_id
      }
    }
  `,

  DELETE_PLAN_TAGS: `#graphql
    mutation DeletePlanTags($ids: [Int!]!) {
        delete_plan_tags(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_PRESET_TO_DIRECTIVE: `#graphql
    mutation DeletePresetToDirective($plan_id: Int!, $activity_directive_id: Int!, $preset_id: Int!) {
      delete_preset_to_directive_by_pk(preset_id: $preset_id, activity_id: $activity_directive_id, plan_id: $plan_id) {
        preset_id
      }
    }
  `,

  DELETE_SCHEDULING_CONDITION_METADATA: `#graphql
    mutation DeleteSchedulingCondition($id: Int!) {
      deleteSchedulingConditionMetadata: delete_scheduling_condition_metadata_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_SCHEDULING_CONDITION_METADATA_TAGS: `#graphql
    mutation DeleteSchedulingConditionMetadataTags($ids: [Int!]!) {
      delete_scheduling_condition_metadata_tags(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS: `#graphql
    mutation DeleteSchedulingConditionModelSpecification($conditionIds: [Int!]!, $modelId: Int!) {
      delete_scheduling_condition_model_specification(
        where: {
          condition_id: { _in: $conditionIds },
          _and: {
            model_id: { _eq: $modelId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  DELETE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS: `#graphql
    mutation DeleteSchedulingConditionPlanSpecification($conditionIds: [Int!]!, $planId: Int!) {
      delete_scheduling_specification_conditions(
        where: {
          condition_id: { _in: $conditionIds },
          _and: {
            plan_id: { _eq: $planId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  DELETE_SCHEDULING_GOAL_METADATA: `#graphql
    mutation DeleteSchedulingGoal($id: Int!) {
      deleteSchedulingGoalMetadata: delete_scheduling_goal_metadata_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_SCHEDULING_GOAL_METADATA_TAGS: `#graphql
    mutation DeleteSchedulingGoalMetadataTags($ids: [Int!]!) {
      delete_scheduling_goal_metadata_tags(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS: `#graphql
    mutation DeleteSchedulingGoalModelSpecification($goalIds: [Int!]!, $modelId: Int!) {
      delete_scheduling_goal_model_specification(
        where: {
          goal_id: { _in: $goalIds },
          _and: {
            model_id: { _eq: $modelId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  DELETE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS: `#graphql
    mutation DeleteSchedulingGoalPlanSpecification($goalIds: [Int!]!, $planId: Int!) {
      delete_scheduling_specification_goal(
        where: {
          goal_id: { _in: $goalIds },
          _and: {
            plan_id: { _eq: $planId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  DELETE_SIMULATION_TEMPLATE: `#graphql
    mutation DeleteSimulationTemplate($id: Int!) {
      deleteSimulationTemplate: delete_simulation_template_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_TAG: `#graphql
    mutation DeleteTags($id: Int!) {
      delete_tags_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_USER_SEQUENCE: `#graphql
    mutation DeleteUserSequence($id: Int!) {
      deleteUserSequence: delete_user_sequence_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_VIEW: `#graphql
    mutation DeleteView($id: Int!) {
      deletedView: delete_view_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_VIEWS: `#graphql
    mutation DeleteViews($ids: [Int!]!) {
      delete_view(where: { id: { _in: $ids } }) {
        returning {
          id
        }
      }
    }
  `,

  DUPLICATE_PLAN: `#graphql
    mutation DuplicatePlan($plan_id: Int!, $new_plan_name: String!) {
      duplicate_plan(args: { new_plan_name: $new_plan_name, plan_id: $plan_id }) {
        new_plan_id
      }
    }
  `,

  EXPAND: `#graphql
    mutation Expand($expansionSetId: Int!, $simulationDatasetId: Int!) {
      expand: expandAllActivities(expansionSetId: $expansionSetId, simulationDatasetId: $simulationDatasetId) {
        id
      }
    }
  `,

  GET_ACTIVITY_DIRECTIVE_CHANGELOG: `#graphql
    query GetActivityTypesExpansionRules($activityId: Int!, $planId: Int!) {
      activityDirectiveRevisions: activity_directive_changelog(
        where: { plan_id: { _eq: $planId }, _and: { activity_directive_id: { _eq: $activityId }}},
        order_by: { revision: desc }
      ) {
        revision
        changed_by
        changed_at
        anchor_id
        anchored_to_start
        arguments
        metadata
        name
        start_offset
      }
    }
  `,

  GET_ACTIVITY_TYPES_EXPANSION_RULES: `#graphql
    query GetActivityTypesExpansionRules($modelId: Int!) {
      activity_types: activity_type(where: { model_id: { _eq: $modelId } }) {
        expansion_rules {
          activity_type
          authoring_command_dict_id
          authoring_mission_model_id
          created_at
          expansion_logic
          id
          updated_at
        }
        name
      }
    }
  `,

  GET_EFFECTIVE_ACTIVITY_ARGUMENTS: `#graphql
    query GetEffectiveActivityArguments($modelId: ID!, $activityTypeName: String!, $arguments: ActivityArguments!) {
      effectiveActivityArguments: getActivityEffectiveArguments(
        missionModelId: $modelId,
        activityTypeName: $activityTypeName,
        activityArguments: $arguments
      ) {
        arguments
        errors
        success
      }
    }
  `,

  GET_EFFECTIVE_MODEL_ARGUMENTS: `#graphql
    query GetEffectiveModelArguments($modelId: ID!, $arguments: ModelArguments!) {
      effectiveModelArguments: getModelEffectiveArguments(
        missionModelId: $modelId,
        modelArguments: $arguments
      ) {
        arguments
        errors
        success
      }
    }
  `,

  GET_EXPANSION_RULE: `#graphql
    query GetExpansionRule($id: Int!) {
      expansionRule: expansion_rule_by_pk(id: $id) {
        activity_type
        authoring_command_dict_id
        authoring_mission_model_id
        created_at
        description
        expansion_logic
        id
        name
        owner
        updated_at
        updated_by
        tags {
          tag {
            color
            id
            name
          }
        }
      }
    }
  `,

  GET_EXPANSION_RUNS: `#graphql
    query GetExpansionRuns {
      expansionRuns: expansion_run(order_by: { id: desc }) {
        created_at
        expansion_set {
          command_dict_id
          created_at
          id
          name
        }
        expanded_sequences {
          edsl_string
          expanded_sequence
          id
          seq_id
          sequence {
            activity_instance_joins {
              simulated_activity {
                id
                activity_type_name
              }
            }
          }
        }
        simulation_dataset {
          dataset_id
          simulation {
            plan {
              id
              name
            }
          }
        }
        id
      }
    }
  `,

  GET_EXPANSION_SEQUENCE_ID: `#graphql
    query GetExpansionSequenceId($simulation_dataset_id: Int!, $simulated_activity_id: Int!) {
      expansionSequence: sequence_to_simulated_activity_by_pk(
        simulation_dataset_id: $simulation_dataset_id,
        simulated_activity_id: $simulated_activity_id
      ) {
        seq_id
      }
    }
  `,

  GET_EXPANSION_SEQUENCE_SEQ_JSON: `#graphql
    query GetExpansionSequenceSeqJson($seqId: String!, $simulationDatasetId: Int!) {
      getSequenceSeqJson(seqId: $seqId, simulationDatasetId: $simulationDatasetId) {
        errors {
          location {
            column
            line
          }
          message
          stack
        }
        seqJson
        status
      }
    }
  `,

  GET_EXTENSIONS: `#graphql
    query GetExtensions {
      extensions {
        description
        extension_roles {
          extension_id
          role
        }
        id
        label
        updated_at
        url
      }
    }
  `,

  GET_MODELS: `#graphql
    query GetModels {
      models: mission_model {
        created_at
        description
        id
        jar_id
        name
        plans {
          id
        }
        owner
        version
      }
    }
  `,

  GET_PARSED_COMMAND_DICTIONARY: `#graphql
    query GetParsedCommandDictionary($commandDictionaryId: Int!) {
      command_dictionary(where: { id: { _eq: $commandDictionaryId } }) {
        parsed_json
      }
    }
  `,

  GET_PERMISSIBLE_QUERIES: `#graphql
    query GetPermissibleQueries {
      queries: __schema {
        queryType {
          fields {
            name
          }
        }
        mutationType {
          fields {
            name
          }
        }
      }
    }
  `,

  GET_PLAN: `#graphql
    query GetPlan($id: Int!) {
      plan: plan_by_pk(id: $id) {
        child_plans {
          id
          name
        }
        collaborators {
          collaborator
        }
        created_at
        duration
        id
        is_locked
        model: mission_model {
          id
          jar_id
          name
          owner
          parameters {
            parameters
          }
          version
        }
        model_id
        name
        owner
        parent_plan {
          id
          name
          owner
          collaborators {
            collaborator
          }
          is_locked
        }
        revision
        scheduling_specification {
          id
        }
        simulations(order_by: { id: desc }, limit: 1) {
          simulation_datasets(order_by: { id: desc }) {
            id
            plan_revision
          }
        }
        start_time
        updated_at
        updated_by
        tags {
          tag {
            color
            id
            name
          }
        }
      }
    }
  `,

  GET_PLANS_AND_MODELS: `#graphql
    query GetPlansAndModels {
      models: mission_model(order_by: { id: desc }) {
        id
        jar_id
        name
        plans {
          id
        }
        version
      }
      plans: plan(order_by: { id: desc }) {
        collaborators {
          collaborator
        }
        created_at
        duration
        id
        model_id
        name
        owner
        revision
        start_time
        updated_at
        updated_by
        tags {
          tag {
            color
            id
            name
          }
        }
      }
    }
  `,

  GET_PLANS_AND_MODELS_FOR_SCHEDULING: `#graphql
    query GetPlansAndSchedulingSpecifications {
      models: mission_model(order_by: { id: desc }) {
        id
        jar_id
        name
        plans {
          id
        }
        version
      }
      plans: plan(order_by: { id: desc }) {
        collaborators {
          collaborator
        }
        scheduling_specification {
          id
        }
        model_id
        name
        owner
        id
      }
    }
  `,

  GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES: `#graphql
    query GetPlanMergeNonConflictingActivities($merge_request_id: Int!) {
      nonConflictingActivities: get_non_conflicting_activities(args: { _merge_request_id: $merge_request_id } ) {
        activity_id,
        change_type,
        source,
        source_tags,
        target,
        target_tags
      }
    }
  `,

  GET_PLAN_SNAPSHOT_ACTIVITY_DIRECTIVES: `#graphql
    query GetPlanSnapshotActivityDirectives($planSnapshotId: Int!) {
      plan_snapshot_activity_directives: plan_snapshot_activities(where: { snapshot_id: { _eq: $planSnapshotId } }, order_by: { start_offset: asc }) {
        anchor_id
        anchored_to_start
        arguments
        created_at
        id
        last_modified_arguments_at
        last_modified_at
        metadata
        name
        source_scheduling_goal_id
        start_offset
        tags {
          tag {
            color
            id
            name
          }
        }
        type
      }
    }
  `,

  GET_PROFILE: `#graphql
    query GetProfile($datasetId: Int!, $name: String!) {
      profile(where: { _and: { dataset_id: { _eq: $datasetId }, name: { _eq: $name } } }, limit: 1) {
        dataset_id
        duration
        id
        name
        profile_segments(where: { dataset_id: { _eq: $datasetId } }, order_by: { start_offset: asc }) {
          dataset_id
          dynamics
          is_gap
          profile_id
          start_offset
        }
        type
      }
    }
  `,

  GET_PROFILES: `#graphql
    query GetProfiles($datasetId: Int!) {
      profile(where: { dataset_id: { _eq: $datasetId } }) {
        dataset_id
        duration
        id
        name
        profile_segments(where: { dataset_id: { _eq: $datasetId } }, order_by: { start_offset: asc }) {
          dataset_id
          dynamics
          is_gap
          profile_id
          start_offset
        }
        type
      }
    }
  `,

  GET_PROFILES_EXTERNAL: `#graphql
    query GetProfilesExternal($planId: Int!, $simulationDatasetFilter: [plan_dataset_bool_exp!]) {
      plan_dataset(where: { plan_id: { _eq: $planId }, _or: $simulationDatasetFilter }) {
        dataset {
          profiles {
            dataset_id
            duration
            id
            name
            profile_segments(order_by: { start_offset: asc }) {
              dataset_id
              dynamics
              is_gap
              profile_id
              start_offset
            }
            type
          }
        }
        offset_from_plan_start
      }
    }
  `,

  GET_PROFILES_EXTERNAL_NAMES: `#graphql
    query GetProfilesExternalNames($planId: Int!) {
      plan_dataset(where: { plan_id: { _eq: $planId }}) {
        dataset {
          profiles {
            name
          }
        }
      }
    }
  `,

  GET_RESOURCE_TYPES: `#graphql
    query GetResourceTypes($model_id: Int!, $limit: Int) {
      resource_types: resource_type(where: { model_id: { _eq: $model_id } }, order_by: { name: asc }, limit: $limit) {
        name
        schema
      }
    }
  `,

  GET_ROLE_PERMISSIONS: `#graphql
    query GetRolePermissions {
      rolePermissions: user_role_permission {
        role
        action_permissions
        function_permissions
      }
    }
  `,

  GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION: `#graphql
    query GetSchedulingSpecConditionsForCondition($condition_id: Int!) {
      scheduling_specification_conditions(where: { condition_id: { _eq: $condition_id } }) {
        enabled
        condition_id
        specification_id
      }
    }
  `,

  GET_SCHEDULING_SPEC_GOALS_FOR_GOAL: `#graphql
    query GetSchedulingSpecGoalsForGoal($goal_id: Int!) {
      scheduling_specification_goals(where: { goal_id: { _eq: $goal_id } }) {
        enabled
        goal_id
        priority
        specification_id
      }
    }
  `,

  GET_SIMULATION_DATASET_ID: `#graphql
    query GetSimulationDatasetId($datasetId: Int!) {
      simulation_dataset(where: {dataset_id: {_eq: $datasetId}}) {
        id
      }
    }
  `,

  GET_SPANS: `#graphql
    query GetSpans($datasetId: Int!) {
      span(where: { dataset_id: { _eq: $datasetId } }, order_by: { start_offset: asc }) {
        attributes
        dataset_id
        duration
        id
        parent_id
        start_offset
        type
      }
    }
  `,

  GET_TYPESCRIPT_ACTIVITY_TYPE: `#graphql
    query GetTypeScriptActivityType($activityTypeName: String!, $modelId: Int!) {
      dslTypeScriptResponse: getActivityTypeScript(activityTypeName: $activityTypeName, missionModelId:$modelId) {
        reason
        status
        typescriptFiles {
          content
          filePath
        }
      }
    }
  `,

  GET_TYPESCRIPT_COMMAND_DICTIONARY: `#graphql
    query GetTypeScriptCommandDictionary($commandDictionaryId: Int!) {
      dslTypeScriptResponse: getCommandTypeScript(commandDictionaryId: $commandDictionaryId) {
        reason
        status
        typescriptFiles {
          content
          filePath
        }
      }
    }
  `,

  GET_TYPESCRIPT_CONSTRAINTS: `#graphql
    query GetTypeScriptConstraints($model_id: ID!) {
      dslTypeScriptResponse: constraintsDslTypescript(missionModelId: $model_id) {
        reason
        status
        typescriptFiles {
          content
          filePath
        }
      }
    }
  `,

  GET_TYPESCRIPT_SCHEDULING: `#graphql
    query GetTypeScriptScheduling($model_id: Int!) {
      dslTypeScriptResponse: schedulingDslTypescript(missionModelId: $model_id) {
        reason
        status
        typescriptFiles {
          content
          filePath
        }
      }
    }
  `,

  GET_UPLOADED_FILENAME: `#graphql
    query GetUploadedFileName($id: Int!) {
      uploaded_file(where: { id: { _eq: $id }}) {
        name
      }
    }
  `,

  GET_USER_SEQUENCE: `#graphql
    query GetUserSequence($id: Int!) {
      userSequence: user_sequence_by_pk(id: $id) {
        authoring_command_dict_id
        created_at
        definition
        id
        name
        owner
        updated_at
      }
    }
  `,

  GET_USER_SEQUENCE_FROM_SEQ_JSON: `#graphql
    query GetUserSequenceFromSeqJson($seqJson: SequenceSeqJson!) {
      sequence: getEdslForSeqJson(seqJson: $seqJson)
    }
  `,

  GET_USER_SEQUENCE_SEQ_JSON: `#graphql
    query GetUserSequenceSeqJson($commandDictionaryId: Int!, $sequenceDefinition: String!) {
      getUserSequenceSeqJson(commandDictionaryID: $commandDictionaryId, edslBody: $sequenceDefinition) {
        errors {
          location {
            column
            line
          }
          message
          stack
        }
        seqJson
        status
      }
    }
  `,

  GET_VIEW: `#graphql
    query GetView($id: Int!) {
      view: view_by_pk(id: $id) {
        created_at
        definition
        id
        name
        owner
        updated_at
      }
    }
  `,

  INITIAL_SIMULATION_UPDATE: `#graphql
    mutation initialSimulationUpdate($plan_id: Int!, $simulation: simulation_set_input!) {
      update_simulation(where: {plan_id: {_eq: $plan_id}}, _set: $simulation) {
        returning {
          id
        }
      }
    }
  `,

  INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY: `#graphql
    mutation InsertSequenceToActivity($input: sequence_to_simulated_activity_insert_input!) {
      sequence: insert_sequence_to_simulated_activity_one(
        object: $input,
        on_conflict: {
          constraint: sequence_to_simulated_activity_primary_key,
          update_columns: [seq_id]
        }
      ) {
        seq_id
      }
    }
  `,

  PLAN_MERGE_BEGIN: `#graphql
    mutation PlanMergeBegin($merge_request_id: Int!) {
      begin_merge(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_CANCEL: `#graphql
    mutation PlanMergeCancel($merge_request_id: Int!) {
      cancel_merge(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_COMMIT: `#graphql
    mutation PlanMergeCommit($merge_request_id: Int) {
      commit_merge(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_DENY: `#graphql
    mutation PlanMergeDeny($merge_request_id: Int) {
      deny_merge(args: { merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_REQUEST_WITHDRAW: `#graphql
    mutation PlanMergeRequestWithdraw($merge_request_id: Int!) {
      withdraw_merge_request(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_RESOLVE_ALL_CONFLICTS: `#graphql
    mutation PlanMergeResolveAllConflicts($merge_request_id: Int!, $resolution: resolution_type!) {
      set_resolution_bulk (
        args: { _merge_request_id: $merge_request_id, _resolution: $resolution }
      ) {
        activity_id
        change_type_source
        change_type_target
        resolution
        merge_base
        source
        target
      }
    }
  `,

  PLAN_MERGE_RESOLVE_CONFLICT: `#graphql
    mutation PlanMergeResolveConflict($merge_request_id: Int!, $activity_id: Int!, $resolution: resolution_type!) {
      set_resolution(
        args: { _merge_request_id: $merge_request_id, _activity_id: $activity_id, _resolution: $resolution }
      ) {
        activity_id
        change_type_source
        change_type_target
        resolution
        merge_base
        source
        target
      }
    }
  `,

  RESTORE_ACTIVITY_FROM_CHANGELOG: `#graphql
    mutation RestoreActivityFromChangelog($activity_id: Int!, $plan_id: Int!, $revision: Int!) {
      restoreActivityFromChangelog(args: { _plan_id: $plan_id, _activity_directive_id: $activity_id, _revision: $revision }) {
        id
      }
    }
  `,

  RESTORE_PLAN_SNAPSHOT: `#graphql
    mutation RestorePlanSnapshot($plan_id: Int!, $snapshot_id: Int!) {
      restore_from_snapshot(args: { _plan_id: $plan_id, _snapshot_id: $snapshot_id }) {
        snapshot_id
      }
    }
  `,

  SCHEDULE: `#graphql
    query Schedule($specificationId: Int!) {
      schedule(specificationId: $specificationId) {
        reason
        analysisId
      }
    }
  `,

  SIMULATE: `#graphql
    query Simulate($planId: Int!, $force: Boolean!) {
      simulate(planId: $planId, force: $force) {
        reason
        simulationDatasetId
        status
      }
    }
  `,

  SUB_ACTIVITY_DIRECTIVES: `#graphql
    subscription SubActivityDirectives($planId: Int!) {
      activity_directives: activity_directive(where: { plan_id: { _eq: $planId } }, order_by: { start_offset: asc }) {
        anchor_id
        anchor_validations {
          activity_id
          plan_id
          reason_invalid
        }
        anchored_to_start
        applied_preset {
          preset_id
          preset_applied {
            arguments
            associated_activity_type
            id
            name
            owner
          }
        }
        arguments
        created_at
        created_by
        id
        last_modified_arguments_at
        last_modified_at
        last_modified_by
        metadata
        name
        plan_id
        source_scheduling_goal_id
        start_offset
        tags {
          tag {
            color
            id
            name
          }
        }
        type
      }
    }
  `,

  SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS: `#graphql
    subscription SubActivityDirectiveMetadataSchemas {
      activity_directive_metadata_schema(order_by: { key: asc }) {
        key
        schema
      }
    }
  `,

  SUB_ACTIVITY_DIRECTIVE_VALIDATIONS: `#graphql
    subscription SubActivityDirectiveValidationErrors($planId: Int!) {
      activity_directive_validations(where: {
        plan_id: {_eq: $planId}
      }) {
        directive_id
        plan_id
        status
        validations
      }
    }
  `,

  SUB_ACTIVITY_PRESETS: `#graphql
    subscription SubActivityPresets($modelId: Int!, $activityTypeName: String!) {
      activity_presets(where: {
        model_id: { _eq: $modelId },
        associated_activity_type: { _eq: $activityTypeName }
      }) {
        id
        model_id
        name
        associated_activity_type
        arguments
        owner
      }
    }
  `,

  SUB_ACTIVITY_TYPES: `#graphql
    subscription SubActivityTypes($modelId: Int!) {
      activity_type(where: { model_id: { _eq: $modelId } }, order_by: { name: asc }) {
        computed_attributes_value_schema
        name
        parameters
        required_parameters
      }
    }
  `,

  SUB_ANCHOR_VALIDATION_STATUS: `#graphql
    subscription SubAnchorValidationStatus($planId: Int!) {
      anchor_validation_status: anchor_validation_status(where: { plan_id: { _eq: $planId } }) {
        activity_id,
        plan_id,
        reason_invalid
      }
    }
  `,

  SUB_COMMAND_DICTIONARIES: `#graphql
    subscription SubCommandDictionaries {
      command_dictionary(order_by: { id: desc }) {
        command_types_typescript_path
        created_at
        id
        mission
        version
      }
    }
  `,

  SUB_CONSTRAINT: `#graphql
    subscription SubConstraint($id: Int!) {
      constraint: constraint_metadata_by_pk(id: $id) {
        created_at
        description
        id
        name
        models_using {
          model_id
        }
        owner
        plans_using {
          plan_id
        }
        public
        tags {
          tag {
            color
            id
            name
          }
        }
        updated_at
        updated_by
        versions {
          author
          definition
          revision
          tags {
            tag {
              color
              id
              name
            }
          }
        }
      }
    }
  `,

  SUB_CONSTRAINTS: `#graphql
    subscription SubConstraints {
      constraints: constraint_metadata(order_by: { name: asc }) {
        created_at
        description
        id
        name
        models_using {
          model_id
        }
        owner
        plans_using {
          plan_id
        }
        public
        tags {
          tag {
            color
            id
            name
          }
        }
        updated_at
        updated_by
        versions {
          author
          definition
          revision
        }
      }
    }
  `,

  SUB_CONSTRAINT_DEFINITION: `#graphql
    subscription SubConstraintDefinition($id: Int!, $revision: Int!) {
      constraintDefinition: constraint_definition_by_pk(constraint_id: $id, revision: $revision) {
        definition
        revision
        tags {
          tag {
            color
            id
            name
          }
        }
      }
    }
  `,

  SUB_CONSTRAINT_PLAN_SPECIFICATIONS: `#graphql
    subscription SubConstraintPlanSpecifications($planId: Int!) {
      constraintPlanSpecs: constraint_specification(
        where: {plan_id: {_eq: $planId}},
        order_by: { constraint_id: desc }
      ) {
        constraint_id
        constraint_revision
        enabled
        constraint_metadata {
          name
          owner
          public
          versions {
            revision
          }
        }
        plan_id
      }
    }
  `,

  SUB_EXPANSION_RULES: `#graphql
    subscription SubExpansionRules {
      expansionRules: expansion_rule(order_by: { id: desc }) {
        activity_type
        authoring_command_dict_id
        authoring_mission_model_id
        created_at
        description
        expansion_logic
        id
        name
        owner
        updated_at
        updated_by
        tags {
          tag_id
        }
      }
    }
  `,

  SUB_EXPANSION_RULE_TAGS: `#graphql
    subscription SubExpansionRuleTags {
      expansionRuleTags: expansion_rule_tags(order_by: { rule_id: desc }) {
        rule_id
        tag_id
      }
    }
  `,

  SUB_EXPANSION_SEQUENCES: `#graphql
    subscription SubExpansionSequences {
      sequence {
        created_at
        metadata
        seq_id
        simulation_dataset_id
      }
    }
  `,

  SUB_EXPANSION_SETS: `#graphql
    subscription SubExpansionSets {
      expansionSets: expansion_set(order_by: { id: desc }) {
        command_dict_id
        created_at
        description
        expansion_rules {
          activity_type
          authoring_command_dict_id
          authoring_mission_model_id
          expansion_logic
          id
          owner
        }
        id
        mission_model_id
        name
        owner
        updated_at
        updated_by
      }
    }
  `,

  SUB_MODELS: `#graphql
    subscription SubModels {
      models: mission_model(order_by: { name: asc }) {
        created_at
        description
        id
        jar_id
        name
        plans {
          id
        }
        owner
        version
      }
    }
  `,

  SUB_PLAN_DATASET: `#graphql
    subscription SubPlanDatasets($planId: Int!) {
      plan_dataset(where: {plan_id: {_eq: $planId}}) {
        dataset_id
        simulation_dataset_id
        dataset {
          profiles {
            duration
            id
            name
            type
          }
        }
      }
    }
  `,

  SUB_PLAN_LOCKED: `#graphql
    subscription SubPlanLocked($planId: Int!) {
      planLocked: plan_by_pk(id: $planId) {
        is_locked
      }
    }
  `,

  SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES: `#graphql
    subscription SubPlanMergeConflictingActivities($merge_request_id: Int!) {
      conflictingActivities: get_conflicting_activities(args: { _merge_request_id: $merge_request_id } ) {
        activity_id,
        change_type_source,
        change_type_target,
        merge_base,
        resolution
        source,
        source_tags,
        target,
        target_tags,
      }
    }
  `,

  SUB_PLAN_MERGE_REQUESTS_INCOMING: `#graphql
    subscription SubPlanMergeRequestsIncoming($planId: Int!) {
      merge_request(where: { plan_id_receiving_changes: { _eq: $planId } }, order_by: { id: desc }) {
        id
        plan_receiving_changes {
          id
          model: mission_model {
            id
            name
            owner
            version
          }
          name
          owner
          collaborators {
            collaborator
          }
        }
        plan_snapshot_supplying_changes {
          plan {
            id
            model: mission_model {
              id
              name
              owner
              version
            }
            name
            owner
            collaborators {
              collaborator
            }
          }
          snapshot_id
        }
        requester_username
        reviewer_username
        status
      }
    }
  `,

  SUB_PLAN_MERGE_REQUESTS_OUTGOING: `#graphql
    subscription SubPlanMergeRequestsOutgoing($planId: Int!) {
      merge_request(where: { plan_snapshot_supplying_changes: { plan_id: { _eq: $planId } } }, order_by: { id: desc }) {
        id
        plan_receiving_changes {
          id
          model: mission_model {
            id
            name
            owner
            version
          }
          name
          owner
          collaborators {
            collaborator
          }
        }
        plan_snapshot_supplying_changes {
          plan {
            id
            model: mission_model {
              id
              name
              owner
              version
            }
            name
            owner
            collaborators {
              collaborator
            }
          }
          snapshot_id
        }
        requester_username
        status
      }
    }
  `,

  SUB_PLAN_MERGE_REQUEST_IN_PROGRESS: `#graphql
    subscription SubPlanMergeRequestInProgress($planId: Int!) {
      merge_requests: merge_request(where: { _and: [{ plan_id_receiving_changes: { _eq: $planId } }, { status: { _eq: "in-progress" } }] }, limit: 1 ) {
        id
        plan_receiving_changes {
          id
          model: mission_model {
            id
            name
            owner
            version
          }
          name
          owner
          collaborators {
            collaborator
          }
        }
        plan_snapshot_supplying_changes {
          plan {
            id
            model: mission_model {
              id
              name
              owner
              version
            }
            name
            owner
            collaborators {
              collaborator
            }
          }
          snapshot_id
        }
        requester_username
        reviewer_username
        status
      }
    }
  `,

  SUB_PLAN_MERGE_REQUEST_STATUS: `#graphql
    subscription SubPlanMergeRequestStatus($mergeRequestId: Int!) {
      merge_request: merge_request_by_pk(id: $mergeRequestId) {
        status
      }
    }
  `,

  SUB_PLAN_REVISION: `#graphql
    subscription SubPlanRevision($planId: Int!) {
      plan: plan_by_pk(id: $planId) {
        revision
      }
    }
  `,

  SUB_PLAN_SNAPSHOTS: `#graphql
    subscription SubPlanSnapshot($planId: Int!) {
      plan_snapshots: plan_snapshot(where: { plan_id: { _eq: $planId } }, order_by: { taken_at: desc }) {
        snapshot_id
        plan_id
        revision
        snapshot_name
        description
        taken_by
        taken_at
        tags {
          tag {
            color
            id
            name
          }
        }
      }
    }
  `,

  SUB_PLAN_TAGS: `#graphql
    subscription SubPlanTags($planId: Int!) {
      plan: plan_by_pk(id: $planId) {
        tags {
          tag {
            color
            id
            name
          }
        }
      }
    }
  `,

  SUB_SCHEDULING_CONDITION: `#graphql
    subscription SubSchedulingCondition($id: Int!) {
      condition: scheduling_condition_metadata_by_pk(id: $id) {
        created_at
        description
        id
        name
        models_using {
          model_id
        }
        owner
        plans_using {
          specification {
            plan_id
          }
        }
        public
        tags {
          tag_id
        }
        updated_at
        updated_by
        versions {
          author
          definition
          revision
          tags {
            tag_id
          }
        }
      }
    }
  `,

  SUB_SCHEDULING_CONDITIONS: `#graphql
    subscription SubSchedulingConditions {
      conditions: scheduling_condition_metadata(order_by: { name: asc }) {
        created_at
        description
        id
        name
        models_using {
          model_id
        }
        owner
        plans_using {
          specification {
            plan_id
          }
        }
        public
        tags {
          tag_id
        }
        updated_at
        updated_by
        versions {
          author
          definition
          revision
          tags {
            tag_id
          }
        }
      }
    }
  `,

  SUB_SCHEDULING_GOAL: `#graphql
    subscription SubSchedulingGoal($id: Int!) {
      goal: scheduling_goal_metadata_by_pk(id: $id) {
        created_at
        description
        id
        name
        models_using {
          model_id
        }
        owner
        plans_using {
          specification {
            plan_id
          }
        }
        public
        tags {
          tag_id
        }
        updated_at
        updated_by
        versions {
          author
          definition
          revision
          tags {
            tag_id
          }
        }
      }
    }
  `,

  SUB_SCHEDULING_GOALS: `#graphql
    subscription SubSchedulingGoals {
      goals: scheduling_goal_metadata(order_by: { name: asc }) {
        analyses(order_by: { analysis_id: desc }) {
          analysis_id
          goal_id
          goal_revision
          request {
            specification_id
          }
          satisfied
          satisfying_activities {
            activity_id
          }
        }
        created_at
        description
        id
        name
        models_using {
          model_id
        }
        owner
        plans_using {
          specification {
            plan_id
          }
        }
        public
        tags {
          tag_id
        }
        updated_at
        updated_by
        versions {
          author
          definition
          revision
          tags {
            tag_id
          }
        }
      }
    }
  `,

  SUB_SCHEDULING_PLAN_SPECIFICATION: `#graphql
    subscription SubSchedulingPlanSpecification($specificationId: Int!) {
      schedulingPlanSpec: scheduling_specification_by_pk(id: $specificationId) {
        analysis_only
        horizon_end
        horizon_start
        id
        plan_id
        plan_revision
        revision
        simulation_arguments
        conditions {
          condition_id
          condition_metadata {
            name
            owner
            public
            versions {
              revision
            }
          }
          condition_revision
          enabled
          specification_id
        }
        goals {
          enabled
          goal_definition {
            analyses(order_by: { analysis_id: desc }) {
              analysis_id
              goal_id
              goal_revision
              request {
                specification_id
              }
              satisfied
              satisfying_activities {
                activity_id
              }
            }
          }
          goal_id
          goal_metadata {
            name
            owner
            public
            versions(order_by: {revision: desc}, limit: 1) {
              analyses(order_by: { analysis_id: desc }) {
                analysis_id
                goal_id
                goal_revision
                request {
                  specification_id
                }
                satisfied
                satisfying_activities {
                  activity_id
                }
              }
              revision
            }
          }
          goal_revision
          priority
          simulate_after
          specification_id
        }
      }
    }
  `,

  SUB_SCHEDULING_REQUESTS: `#graphql
    subscription SubSchedulingRequests($specId: Int!) {
      scheduling_request(where: { specification_id: { _eq: $specId } }, order_by: { analysis_id: desc }) {
        specification_id
        analysis_id
        requested_at
        requested_by
        status
        reason
        dataset_id
        specification_revision
        canceled
      }
    }
  `,

  SUB_SIMULATION: `#graphql
    subscription SubSimulation($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
        arguments
        id
        revision
        simulation_start_time
        simulation_end_time
        template: simulation_template {
          arguments
          description
          id
          owner
        }
      }
    }
  `,

  SUB_SIMULATION_DATASET: `#graphql
    subscription SubSimulationDataset($simulationDatasetId: Int!) {
      simulation_dataset_by_pk(id: $simulationDatasetId) {
        dataset_id
        canceled
        id
        plan_revision
        reason
        requested_at
        requested_by
        simulation_end_time
        simulation_revision
        simulation_start_time
        status
        extent {
          extent
        }
        reason
      }
    }
  `,

  SUB_SIMULATION_DATASETS: `#graphql
    subscription SubSimulationDatasets($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }) {
        simulation_datasets(order_by: { id: desc }) {
          canceled
          id
          dataset_id
          plan_revision
          requested_at
          requested_by
          simulation_end_time
          simulation_start_time
          status
          extent {
            extent
          }
          reason
        }
      }
    }
  `,

  SUB_SIMULATION_DATASETS_ALL: `#graphql
    subscription SubSimulationDatasetsAll {
      simulation_dataset(order_by: { id: desc }) {
        canceled
        id
        status
      }
    }
  `,

  SUB_SIMULATION_DATASET_LATEST: `#graphql
    subscription SubSimulationDatasetLatest($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
        simulation_datasets(order_by: { id: desc }, limit: 1) {
          dataset_id
          canceled
          id
          plan_revision
          reason
          requested_at
          requested_by
          simulation_end_time
          simulation_revision
          simulation_start_time
          status
          extent {
            extent
          }
          reason
        }
      }
    }
  `,

  SUB_SIMULATION_TEMPLATES: `#graphql
    subscription SubSimTemplates($modelId: Int!) {
      templates: simulation_template(where: { model_id: { _eq: $modelId } }) {
        arguments
        description
        id
        owner
      }
    }
  `,

  SUB_TAGS: `#graphql
    subscription SubTags {
      tags(order_by: { name: desc })  {
        color
        created_at
        id
        name
        owner
      }
    }
  `,

  SUB_USER_SEQUENCES: `#graphql
    subscription SubUserSequences {
      user_sequence(order_by: { id: desc }) {
        authoring_command_dict_id
        created_at
        definition
        id
        name
        owner
        updated_at
      }
    }
  `,

  SUB_VIEWS: `#graphql
    subscription SubViews {
      views: view {
        created_at
        id
        name
        owner
        updated_at
      }
    }
  `,

  UPDATE_ACTIVITY_DIRECTIVE: `#graphql
    mutation UpdateActivityDirective($id: Int!, $plan_id: Int!, $activityDirectiveSetInput: activity_directive_set_input!) {
      update_activity_directive_by_pk(
        pk_columns: { id: $id, plan_id: $plan_id }, _set: $activityDirectiveSetInput
      ) {
        anchor_id
        anchored_to_start
        applied_preset {
          preset_id
          preset_applied {
            name
            arguments
          }
        }
        arguments
        created_at
        id
        last_modified_arguments_at
        last_modified_at
        metadata
        name
        plan_id
        source_scheduling_goal_id
        start_offset
        tags {
          tag {
            color
            id
            name
          }
        }
        type
      }
    }
  `,

  UPDATE_ACTIVITY_PRESET: `#graphql
    mutation UpdateActivityPreset($id: Int!, $activityPresetSetInput: activity_presets_set_input!) {
      update_activity_presets_by_pk(
        pk_columns: { id: $id }, _set: $activityPresetSetInput
      ) {
        id
        model_id
        name
        associated_activity_type
        arguments
      }
    }
  `,

  UPDATE_CONSTRAINT_DEFINITION_TAGS: `#graphql
    mutation UpdateConstraintTags($constraintId: Int!, $constraintRevision: Int!, $tags: [constraint_definition_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      insertConstraintDefinitionTags: insert_constraint_definition_tags(objects: $tags, on_conflict: {
        constraint: constraint_definition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteConstraintDefinitionTags: delete_constraint_definition_tags(
        where: {
          tag_id: { _in: $tagIdsToDelete },
          _and: {
            constraint_id: { _eq: $constraintId },
            constraint_revision: { _eq: $constraintRevision }
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_CONSTRAINT_METADATA: `#graphql
    mutation UpdateConstraintMetadata($id: Int!, $constraintMetadata: constraint_metadata_set_input!, $tags: [constraint_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      updateConstraintMetadata: update_constraint_metadata_by_pk(
        pk_columns: { id: $id }, _set: $constraintMetadata
      ) {
        id
      }
      insertConstraintTags: insert_constraint_tags(objects: $tags, on_conflict: {
        constraint: constraint_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteConstraintTags: delete_constraint_tags(where: { tag_id: { _in: $tagIdsToDelete } }) {
          affected_rows
      }
    }
  `,

  UPDATE_CONSTRAINT_PLAN_SPECIFICATION: `#graphql
    mutation UpdateConstraintPlanSpecification($id: Int!, $revision: Int!, $enabled: Boolean!, $planId: Int!) {
      updateConstraintPlanSpecification: update_constraint_specification_by_pk(
        pk_columns: { constraint_id: $id, plan_id: $planId },
        _set: {
          constraint_revision: $revision,
          enabled: $enabled
        }
      ) {
        constraint_revision
        enabled
      }
    }
  `,

  UPDATE_CONSTRAINT_PLAN_SPECIFICATIONS: `#graphql
    mutation UpdateConstraintPlanSpecifications($constraintSpecsToUpdate: [constraint_specification_insert_input!]!, $constraintSpecIdsToDelete: [Int!]! = [], $planId: Int!) {
      updateConstraintPlanSpecifications: insert_constraint_specification(
        objects: $constraintSpecsToUpdate,
        on_conflict: {
          constraint: constraint_specification_pkey,
          update_columns: [constraint_revision, enabled]
        },
      ) {
        returning {
          constraint_revision
          enabled
        }
      }
      deleteConstraintPlanSpecifications: delete_constraint_specification(
        where: {
          constraint_id: { _in: $constraintSpecIdsToDelete },
          _and: {
            plan_id: { _eq: $planId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_EXPANSION_RULE: `#graphql
    mutation UpdateExpansionRule($id: Int!, $rule: expansion_rule_set_input!) {
      updateExpansionRule: update_expansion_rule_by_pk(
        pk_columns: { id: $id }, _set: $rule
      ) {
        updated_at
      }
    }
  `,

  UPDATE_PLAN_SNAPSHOT: `#graphql
    mutation UpdatePlanSnapshot($snapshot_id: Int!, $planSnapshot: plan_snapshot_set_input!) {
      updatePlanSnapshot: update_plan_snapshot_by_pk(
        pk_columns: { snapshot_id: $snapshot_id }, _set: $planSnapshot
      ) {
        snapshot_id
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS: `#graphql
    mutation UpdateSchedulingConditionTags($conditionId: Int!, $conditionRevision: Int!, $tags: [scheduling_condition_definition_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      insertSchedulingConditionDefinitionTags: insert_scheduling_condition_definition_tags(objects: $tags, on_conflict: {
        constraint: scheduling_condition_definition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingConditionDefinitionTags: delete_scheduling_condition_definition_tags(
        where: {
          tag_id: { _in: $tagIdsToDelete },
          _and: {
            condition_id: { _eq: $conditionId },
            condition_revision: { _eq: $conditionRevision }
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_METADATA: `#graphql
    mutation UpdateSchedulingConditionMetadata($id: Int!, $conditionMetadata: scheduling_condition_metadata_set_input!, $tags: [scheduling_condition_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      updateSchedulingConditionMetadata: update_scheduling_condition_metadata_by_pk(
        pk_columns: { id: $id }, _set: $conditionMetadata
      ) {
        id
      }
      insertSchedulingConditionTags: insert_scheduling_condition_tags(objects: $tags, on_conflict: {
        constraint: scheduling_condition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingConditionTags: delete_scheduling_condition_tags(where: { tag_id: { _in: $tagIdsToDelete } }) {
          affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION: `#graphql
    mutation UpdateSchedulingConditionPlanSpecification($id: Int!, $revision: Int!, $enabled: Boolean!, $specificationId: Int!) {
      updateSchedulingConditionPlanSpecification: update_scheduling_specification_conditions_by_pk(
        pk_columns: { condition_id: $id, specification_id: $specificationId },
        _set: {
          condition_revision: $revision,
          enabled: $enabled
        }
      ) {
        condition_revision
        enabled
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATIONS: `#graphql
    mutation UpdateSchedulingConditionPlanSpecifications($conditionSpecsToUpdate: [scheduling_specification_conditions_insert_input!]!, $conditionSpecIdsToDelete: [Int!]! = [], $specificationId: Int!) {
      updateSchedulingConditionPlanSpecifications: insert_scheduling_specification_conditions(
        objects: $conditionSpecsToUpdate,
        on_conflict: {
          constraint: scheduling_specification_conditions_primary_key,
          update_columns: [condition_revision, enabled]
        },
      ) {
        returning {
          condition_revision
          enabled
        }
      }
      deleteSchedulingConditionPlanSpecifications: delete_scheduling_specification_conditions(
        where: {
          condition_id: { _in: $conditionSpecIdsToDelete },
          _and: {
            specification_id: { _eq: $specificationId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL_DEFINITION_TAGS: `#graphql
    mutation UpdateSchedulingGoalTags($goalId: Int!, $goalRevision: Int!, $tags: [scheduling_goal_definition_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      insertSchedulingGoalDefinitionTags: insert_scheduling_goal_definition_tags(objects: $tags, on_conflict: {
        constraint: scheduling_goal_definition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingGoalDefinitionTags: delete_scheduling_goal_definition_tags(
        where: {
          tag_id: { _in: $tagIdsToDelete },
          _and: {
            goal_id: { _eq: $goalId },
            goal_revision: { _eq: $goalRevision }
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL_METADATA: `#graphql
    mutation UpdateSchedulingGoalMetadata($id: Int!, $goalMetadata: scheduling_goal_metadata_set_input!, $tags: [scheduling_goal_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      updateSchedulingGoalMetadata: update_scheduling_goal_metadata_by_pk(
        pk_columns: { id: $id }, _set: $goalMetadata
      ) {
        id
      }
      insertSchedulingGoalTags: insert_scheduling_goal_tags(objects: $tags, on_conflict: {
        constraint: scheduling_goal_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingGoalTags: delete_scheduling_goal_tags(where: { tag_id: { _in: $tagIdsToDelete } }) {
          affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION: `#graphql
    mutation UpdateSchedulingGoalPlanSpecification($id: Int!, $revision: Int!, $enabled: Boolean!, $priority: Int!, $simulateAfter: Boolean!, $specificationId: Int!) {
      updateSchedulingGoalPlanSpecification: update_scheduling_specification_goals_by_pk(
        pk_columns: { goal_id: $id, specification_id: $specificationId },
        _set: {
          goal_revision: $revision,
          enabled: $enabled,
          priority: $priority,
          simulate_after: $simulateAfter
        }
      ) {
        goal_revision
        enabled
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATIONS: `#graphql
    mutation UpdateSchedulingGoalPlanSpecifications($goalSpecsToUpdate: [scheduling_specification_goals_insert_input!]!, $goalSpecIdsToDelete: [Int!]! = [], $specificationId: Int!) {
      updateSchedulingGoalPlanSpecifications: insert_scheduling_specification_goals(
        objects: $goalSpecsToUpdate,
        on_conflict: {
          constraint: scheduling_specification_goals_primary_key,
          update_columns: [goal_revision, enabled]
        },
      ) {
        returning {
          goal_revision
          enabled
        }
      }
      deleteSchedulingGoalPlanSpecifications: delete_scheduling_specification_goals(
        where: {
          goal_id: { _in: $goalSpecIdsToDelete },
          _and: {
            specification_id: { _eq: $specificationId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_SPEC: `#graphql
    mutation UpdateSchedulingSpec($id: Int!, $spec: scheduling_specification_set_input!) {
      updateSchedulingSpec: update_scheduling_specification_by_pk(
        pk_columns: { id: $id }, _set: $spec
      ) {
        id
      }
    }
  `,

  UPDATE_SCHEDULING_SPEC_CONDITION: `#graphql
    mutation UpdateSchedulingSpecCondition(
      $condition_id: Int!,
      $specification_id: Int!,
      $spec_condition: scheduling_specification_conditions_set_input!
    ) {
      updateSchedulingSpecCondition: update_scheduling_specification_conditions_by_pk(
        pk_columns: { condition_id: $condition_id, specification_id: $specification_id },
        _set: $spec_condition
      ) {
        condition_id
        specification_id
      }
    }
  `,

  UPDATE_SCHEDULING_SPEC_CONDITION_ID: `#graphql
    mutation UpdateSchedulingSpecConditionId(
      $condition_id: Int!,
      $specification_id: Int!,
      $new_specification_id: Int!,
    ) {
      updateSchedulingSpecConditionId: update_scheduling_specification_conditions_by_pk(
        pk_columns: { condition_id: $condition_id, specification_id: $specification_id },
        _set: { specification_id: $new_specification_id },
      ) {
        condition_id
        specification_id
      }
    }
  `,

  UPDATE_SCHEDULING_SPEC_GOAL: `#graphql
    mutation UpdateSchedulingSpecGoal(
      $goal_id: Int!,
      $specification_id: Int!,
      $spec_goal: scheduling_specification_goals_set_input!
    ) {
      updateSchedulingSpecGoal: update_scheduling_specification_goals_by_pk(
        pk_columns: { goal_id: $goal_id, specification_id: $specification_id },
        _set: $spec_goal
      ) {
        goal_id
        specification_id
      }
    }
  `,

  UPDATE_SIMULATION: `#graphql
    mutation UpdateSimulation($id: Int!, $simulation: simulation_set_input!) {
      updateSimulation: update_simulation_by_pk(
        pk_columns: { id: $id }, _set: $simulation
      ) {
        id
      }
    }
  `,

  UPDATE_SIMULATION_TEMPLATE: `#graphql
    mutation UpdateSimulationTemplate($id: Int!, $simulationTemplateSetInput: simulation_template_set_input!) {
      update_simulation_template_by_pk(pk_columns: {id: $id}, _set: $simulationTemplateSetInput) {
        id
        description
        arguments
      }
    }
  `,

  UPDATE_TAG: `#graphql
    mutation UpdateTag($id: Int!, $tagSetInput: tags_set_input!) {
      update_tags_by_pk(pk_columns: {id: $id}, _set: $tagSetInput) {
        color
        created_at
        id
        name
        owner
      }
    }
  `,

  UPDATE_USER_SEQUENCE: `#graphql
    mutation UpdateUserSequence($id: Int!, $sequence: user_sequence_set_input!) {
      updateUserSequence: update_user_sequence_by_pk(
        pk_columns: { id: $id }, _set: $sequence
      ) {
        id
        updated_at
      }
    }
  `,

  UPDATE_VIEW: `#graphql
    mutation UpdateView($id: Int!, $view: view_set_input!) {
      updatedView: update_view_by_pk(
        pk_columns: { id: $id }, _set: $view
      ) {
        created_at
        definition
        id
        name
        owner
        updated_at
      }
    }
  `,

  VALIDATE_ACTIVITY_ARGUMENTS: `#graphql
    query ValidateActivityArguments($arguments: ActivityArguments!, $activityTypeName: String!, $modelId: ID!) {
      validateActivityArguments(
        activityArguments: $arguments,
        activityTypeName: $activityTypeName,
        missionModelId: $modelId
      ) {
        errors {
          message
          subjects
        }
        success
      }
    }
  `,
} as const;

export function convertToGQLArray(array: string[] | number[]) {
  return `{${array.join(',')}}`;
}

export default gql;
