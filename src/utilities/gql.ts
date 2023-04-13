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

  CHECK_CONSTRAINTS: `#graphql
    query CheckConstraints($planId: Int!) {
      checkConstraintsResponse: constraintViolations(planId: $planId) {
        violationsMap: constraintViolations
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
        tags
        type
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
        updated_at
        version
      }
    }
  `,

  CREATE_CONSTRAINT: `#graphql
    mutation CreateConstraint($constraint: constraint_insert_input!) {
      createConstraint: insert_constraint_one(object: $constraint) {
        id
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

  CREATE_EXPANSION_SEQUENCE: `#graphql
    mutation CreateExpansionSequence($sequence: sequence_insert_input!) {
      createExpansionSequence: insert_sequence_one(object: $sequence) {
        seq_id
      }
    }
  `,

  CREATE_EXPANSION_SET: `#graphql
    mutation CreateExpansionSet($dictionaryId: Int!, $modelId: Int!, $expansionRuleIds: [Int!]!) {
      createExpansionSet(
        commandDictionaryId: $dictionaryId,
        missionModelId: $modelId,
        expansionIds: $expansionRuleIds
      ) {
        id
      }
    }
  `,

  CREATE_MODEL: `#graphql
    mutation CreateModel($model: mission_model_insert_input!) {
      createModel: insert_mission_model_one(object: $model) {
        id
      }
    }
  `,

  CREATE_PLAN: `#graphql
    mutation CreatePlan($plan: plan_insert_input!) {
      createPlan: insert_plan_one(object: $plan) {
        id
        revision
        start_time
      }
    }
  `,

  CREATE_PLAN_MERGE_REQUEST: `#graphql
    mutation CreatePlanMergeRequest($requester_username: String!, $source_plan_id: Int!, $target_plan_id: Int!) {
      create_merge_request(args: { requester_username: $requester_username, source_plan_id: $source_plan_id, target_plan_id: $target_plan_id }) {
        merge_request_id
      }
    }
  `,

  CREATE_SCHEDULING_CONDITION: `#graphql
    mutation CreateSchedulingCondition($condition: scheduling_condition_insert_input!) {
      createSchedulingCondition: insert_scheduling_condition_one(object: $condition) {
        author
        created_date
        definition
        description
        id
        last_modified_by
        model_id
        modified_date
        name
        revision
      }
    }
  `,

  CREATE_SCHEDULING_GOAL: `#graphql
    mutation CreateSchedulingGoal($goal: scheduling_goal_insert_input!) {
      createSchedulingGoal: insert_scheduling_goal_one(object: $goal) {
        author
        created_date
        definition
        description
        id
        last_modified_by
        model_id
        modified_date
        name
        revision
      }
    }
  `,

  CREATE_SCHEDULING_SPEC: `#graphql
    mutation CreateSchedulingSpec($spec: scheduling_specification_insert_input!) {
      createSchedulingSpec: insert_scheduling_specification_one(object: $spec) {
        id
      }
    }
  `,

  CREATE_SCHEDULING_SPEC_CONDITION: `#graphql
    mutation CreateSchedulingSpecCondition($spec_condition: scheduling_specification_conditions_insert_input!) {
      createSchedulingSpecCondition: insert_scheduling_specification_conditions_one(object: $spec_condition) {
        enabled
        condition_id
        specification_id
      }
    }
  `,

  CREATE_SCHEDULING_SPEC_GOAL: `#graphql
    mutation CreateSchedulingSpecGoal($spec_goal: scheduling_specification_goals_insert_input!) {
      createSchedulingSpecGoal: insert_scheduling_specification_goals_one(object: $spec_goal) {
        enabled
        goal_id
        priority
        specification_id
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

  DELETE_ACTIVITY_DIRECTIVE: `#graphql
    mutation DeleteActivityDirective($plan_id: Int!, $id: Int!) {
      deleteActivityDirective: delete_activity_directive_by_pk(plan_id: $plan_id, id: $id) {
        id
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

  DELETE_CONSTRAINT: `#graphql
    mutation DeleteConstraint($id: Int!) {
      deleteConstraint: delete_constraint_by_pk(id: $id) {
        id
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
      deleteSimulation: delete_simulation(where: { plan_id: { _eq: $id } }) {
        returning {
          id
        }
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

  DELETE_SCHEDULING_CONDITION: `#graphql
    mutation DeleteSchedulingCondition($id: Int!) {
      deleteSchedulingCondition: delete_scheduling_condition_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_SCHEDULING_GOAL: `#graphql
    mutation DeleteSchedulingGoal($id: Int!) {
      deleteSchedulingGoal: delete_scheduling_goal_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_SCHEDULING_SPEC_GOAL: `#graphql
    mutation DeleteSchedulingSpecGoal($goal_id: Int!, $specification_id: Int!) {
      deleteSchedulingSpecGoal: delete_scheduling_specification_goals_by_pk(goal_id: $goal_id, specification_id: $specification_id) {
        goal_id,
        specification_id,
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

  GET_CONSTRAINT: `#graphql
    query GetConstraint($id: Int!) {
      constraint: constraint_by_pk(id: $id) {
        definition
        description
        id
        model_id
        name
        plan_id
        summary
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
        expansion_logic
        id
        updated_at
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

  GET_MODELS: `#graphql
    query GetModels {
      models: mission_model {
        id
        jar_id,
        name
        version
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
        duration
        id
        is_locked
        model: mission_model {
          id
          jar_id
          name
          parameters {
            parameters
          }
          version
        }
        model_id
        name
        parent_plan {
          id
          name
        }
        revision
        scheduling_specifications {
          id
        }
        simulations(order_by: { id: desc }, limit: 1) {
          simulation_datasets(order_by: { id: desc }, limit: 1) {
            id
          }
        }
        start_time
      }
    }
  `,

  GET_PLANS_AND_MODELS: `#graphql
    query GetPlansAndModels {
      models: mission_model(order_by: { id: desc }) {
        id
        jar_id
        name
        version
      }
      plans: plan(order_by: { id: desc }) {
        duration
        id
        model_id
        name
        revision
        start_time
      }
    }
  `,

  GET_PLANS_AND_MODELS_FOR_SCHEDULING: `#graphql
    query GetPlansAndSchedulingSpecifications {
      models: mission_model(order_by: { id: desc }) {
        id
        jar_id
        name
        version
      }
      plans: plan(order_by: { id: desc }) {
        scheduling_specifications {
          id
        }
        model_id
        name
        id
      }
    }
  `,

  GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES: `#graphql
    query GetPlanMergeNonConflictingActivities($merge_request_id: Int!) {
      nonConflictingActivities: get_non_conflicting_activities(args: { merge_request_id: $merge_request_id } ) {
        activity_id,
        change_type,
        source,
        target
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
    query GetProfilesExternal($planId: Int!) {
      plan_dataset(where: { plan_id: { _eq: $planId } }) {
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

  GET_RESOURCE_TYPES: `#graphql
    query GetResourceTypes($missionModelId: ID!) {
      resourceTypes(missionModelId: $missionModelId) {
        name
        schema
      }
    }
  `,

  GET_SCHEDULING_CONDITION: `#graphql
    query GetSchedulingCondition($id: Int!) {
      condition: scheduling_condition_by_pk(id: $id) {
        author
        created_date
        definition
        description
        id
        last_modified_by
        model_id
        modified_date
        name
        revision
      }
    }
  `,

  GET_SCHEDULING_GOAL: `#graphql
    query GetSchedulingGoal($id: Int!) {
      goal: scheduling_goal_by_pk(id: $id) {
        analyses(limit: 0) {
          analysis_id
        }
        author
        created_date
        definition
        description
        id
        last_modified_by
        model_id
        modified_date
        name
        revision
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
    query GetTypeScriptConstraints($model_id: ID!, $plan_id: Int) {
      dslTypeScriptResponse: constraintsDslTypescript(missionModelId: $model_id, planId: $plan_id) {
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
    mutation PlanMergeBegin($merge_request_id: Int!, $reviewer_username: String!) {
      begin_merge(args: { merge_request_id: $merge_request_id, reviewer_username: $reviewer_username } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_CANCEL: `#graphql
    mutation PlanMergeCancel($merge_request_id: Int!) {
      cancel_merge(args: { merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_COMMIT: `#graphql
    mutation PlanMergeCommit($merge_request_id: Int) {
      commit_merge(args: { merge_request_id: $merge_request_id } ) {
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
      withdraw_merge_request(args: { merge_request_id: $merge_request_id } ) {
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

  SCHEDULE: `#graphql
    query Schedule($specificationId: Int!) {
      schedule(specificationId: $specificationId){
        reason
        status
      }
    }
  `,

  SIMULATE: `#graphql
    query Simulate($planId: Int!) {
      simulate(planId: $planId) {
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
          presets_applied {
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
        tags
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
        updated_at
        version
      }
    }
  `,

  SUB_CONSTRAINTS: `#graphql
    subscription SubConstraints($modelId: Int!, $planId: Int!) {
      constraints: constraint(where: {
        _or: [
          { model_id: { _eq: $modelId } },
          { plan_id: { _eq: $planId } }
        ]
      }, order_by: { name: asc }) {
        definition
        description
        id
        model_id
        name
        plan_id
        summary
      }
    }
  `,

  SUB_CONSTRAINTS_ALL: `#graphql
    subscription SubConstraintsAll {
      constraints: constraint(order_by: { name: asc }) {
        definition
        description
        id
        model_id
        name
        plan_id
        summary
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
        expansion_logic
        id
        updated_at
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
        updated_at
      }
    }
  `,

  SUB_EXPANSION_SETS: `#graphql
    subscription SubExpansionSets {
      expansionSets: expansion_set(order_by: { id: desc }) {
        command_dict_id
        created_at
        expansion_rules {
          activity_type
          authoring_command_dict_id
          authoring_mission_model_id
          expansion_logic
          id
        }
        id
        mission_model_id
      }
    }
  `,

  SUB_MODELS: `#graphql
    subscription SubModels {
      models: mission_model(order_by: { name: asc }) {
        id
        jar_id,
        name
        version
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
      conflictingActivities: get_conflicting_activities(args: { merge_request_id: $merge_request_id } ) {
        activity_id,
        change_type_source,
        change_type_target,
        merge_base,
        resolution
        source,
        target,
      }
    }
  `,

  SUB_PLAN_MERGE_REQUESTS_INCOMING: `#graphql
    subscription SubPlanMergeRequestsIncoming($planId: Int!) {
      merge_request(where: { plan_id_receiving_changes: { _eq: $planId } }, order_by: { id: desc }) {
        id
        plan_receiving_changes {
          id
          name
        }
        plan_snapshot_supplying_changes {
          name
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
          name
        }
        plan_snapshot_supplying_changes {
          name
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
          name
        }
        plan_snapshot_supplying_changes {
          name
          duration
          plan_id
          snapshot_id
          start_time
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

  SUB_SCHEDULING_CONDITIONS: `#graphql
    subscription SubSchedulingConditions {
      conditions: scheduling_condition(order_by: { id: desc }) {
        author
        created_date
        definition
        description
        id
        last_modified_by
        model_id
        modified_date
        name
        revision
      }
    }
  `,

  SUB_SCHEDULING_GOALS: `#graphql
    subscription SubSchedulingGoals {
      goals: scheduling_goal(order_by: { id: desc }) {
        analyses(limit: 0) {
          analysis_id
        }
        author
        created_date
        definition
        description
        id
        last_modified_by
        model_id
        modified_date
        name
        revision
      }
    }
  `,

  SUB_SCHEDULING_SPEC_CONDITIONS: `#graphql
    subscription SubSchedulingSpecConditions($specification_id: Int!) {
      specConditions: scheduling_specification_conditions(where: { specification_id: { _eq: $specification_id } }, order_by: { condition_id: asc }) {
        enabled
        condition {
          author
          created_date
          definition
          description
          id
          last_modified_by
          model_id
          modified_date
          name
          revision
        }
        specification {
          analysis_only
          horizon_end
          horizon_start
          id
          plan_id
          plan_revision
          revision
          simulation_arguments
        }
        specification_id
      }
    }
  `,

  SUB_SCHEDULING_SPEC_GOALS: `#graphql
    subscription SubSchedulingSpecGoals($specification_id: Int!) {
      specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }, order_by: { priority: asc }) {
        enabled
        goal {
          analyses(order_by: { request: { specification_revision: desc } }, limit: 2) {
            analysis_id
            satisfied
            satisfying_activities {
              activity_id
            }
          }
          author
          created_date
          definition
          description
          description
          id
          last_modified_by
          model_id
          modified_date
          name
          revision
        }
        priority
        simulate_after
        specification_id
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
        }
      }
    }
  `,

  SUB_SIMULATION_DATASET: `#graphql
    subscription SubSimulationDataset($simulationDatasetId: Int!) {
      simulation_dataset_by_pk(id: $simulationDatasetId) {
        dataset_id
        id
        plan_revision
        reason
        simulation_end_time
        simulation_revision
        simulation_start_time
        status
      }
    }
  `,

  SUB_SIMULATION_DATASETS: `#graphql
    subscription SubSimulationDatasetIds($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }) {
        simulation_datasets(order_by: { id: desc }) {
          id
          simulation_end_time
          simulation_start_time
        }
      }
    }
`,

  SUB_SIMULATION_DATASET_IDS: `#graphql
    subscription SubSimulationDatasetIds($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
        simulation_dataset_ids: simulation_datasets(order_by: { id: desc }) {
          id
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
        definition
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
          presets_applied {
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
        tags
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

  UPDATE_CONSTRAINT: `#graphql
    mutation UpdateConstraint($id: Int!, $constraint: constraint_set_input!) {
      updateConstraint: update_constraint_by_pk(
        pk_columns: { id: $id }, _set: $constraint
      ) {
        id
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

  UPDATE_SCHEDULING_CONDITION: `#graphql
    mutation UpdateSchedulingCondition($id: Int!, $condition: scheduling_condition_set_input!) {
      updateSchedulingCondition: update_scheduling_condition_by_pk(
        pk_columns: { id: $id }, _set: $condition
      ) {
        id
        last_modified_by
        modified_date
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL: `#graphql
    mutation UpdateSchedulingGoal($id: Int!, $goal: scheduling_goal_set_input!) {
      updateSchedulingGoal: update_scheduling_goal_by_pk(
        pk_columns: { id: $id }, _set: $goal
      ) {
        id
        last_modified_by
        modified_date
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
};

export function convertToGQLArray(array: string[] | number[]) {
  return `{${array.join(',')}}`;
}

export default gql;
