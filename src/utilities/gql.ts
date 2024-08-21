export enum Queries {
  ACTIVITY_DIRECTIVES = 'activity_directive',
  ACTIVITY_DIRECTIVE_CHANGELOG = 'activity_directive_changelog',
  ACTIVITY_DIRECTIVE_METADATA_SCHEMAS = 'activity_directive_metadata_schema',
  ACTIVITY_DIRECTIVE_VALIDATIONS = 'activity_directive_validations',
  ACTIVITY_PRESETS = 'activity_presets',
  ACTIVITY_TYPES = 'activity_type',
  ANCHOR_VALIDATION_STATUS = 'anchor_validation_status',
  APPLY_PRESET_TO_ACTIVITY = 'apply_preset_to_activity',
  BEGIN_MERGE = 'begin_merge',
  CANCEL_MERGE = 'cancel_merge',
  CHANNEL_DICTIONARIES = 'channel_dictionary',
  COMMAND_DICTIONARIES = 'command_dictionary',
  COMMIT_MERGE = 'commit_merge',
  CONSTRAINTS_DSL_TYPESCRIPT = 'constraintsDslTypescript',
  CONSTRAINT_DEFINITION = 'constraint_definition_by_pk',
  CONSTRAINT_METADATA = 'constraint_metadata_by_pk',
  CONSTRAINT_METADATAS = 'constraint_metadata',
  CONSTRAINT_SPECIFICATIONS = 'constraint_specification',
  CONSTRAINT_VIOLATIONS = 'constraintViolations',
  CREATE_EXPANSION_SET = 'createExpansionSet',
  CREATE_MERGE_REQUEST = 'create_merge_request',
  CREATE_SNAPSHOT = 'create_snapshot',
  DELETE_ACTIVITY_DELETE_SUBTREE_BULK = 'delete_activity_by_pk_delete_subtree_bulk',
  DELETE_ACTIVITY_DIRECTIVES = 'delete_activity_directive',
  DELETE_ACTIVITY_DIRECTIVE_TAGS = 'delete_activity_directive_tags',
  DELETE_ACTIVITY_PRESET = 'delete_activity_presets_by_pk',
  DELETE_ACTIVITY_REANCHOR_PLAN_START_BULK = 'delete_activity_by_pk_reanchor_plan_start_bulk',
  DELETE_ACTIVITY_REANCHOR_TO_ANCHOR_BULK = 'delete_activity_by_pk_reanchor_to_anchor_bulk',
  DELETE_CHANNEL_DICTIONARY = 'delete_channel_dictionary_by_pk',
  DELETE_COMMAND_DICTIONARY = 'delete_command_dictionary_by_pk',
  DELETE_CONSTRAINT_DEFINITION_TAGS = 'delete_constraint_definition_tags',
  DELETE_CONSTRAINT_METADATA = 'delete_constraint_metadata_by_pk',
  DELETE_CONSTRAINT_MODEL_SPECIFICATIONS = 'delete_constraint_model_specification',
  DELETE_CONSTRAINT_SPECIFICATIONS = 'delete_constraint_specification',
  DELETE_CONSTRAINT_TAGS = 'delete_constraint_tags',
  DELETE_EXPANSION_RULE = 'delete_expansion_rule_by_pk',
  DELETE_EXPANSION_RULE_TAGS = 'delete_expansion_rule_tags',
  DELETE_EXPANSION_SET = 'delete_expansion_set_by_pk',
  DELETE_MISSION_MODEL = 'delete_mission_model_by_pk',
  DELETE_PARAMETER_DICTIONARY = 'delete_parameter_dictionary_by_pk',
  DELETE_PARCEL = 'delete_parcel_by_pk',
  DELETE_PARCEL_TO_DICTIONARY_ASSOCIATION = 'delete_parcel_to_parameter_dictionary',
  DELETE_PLAN = 'delete_plan_by_pk',
  DELETE_PLAN_COLLABORATOR = 'delete_plan_collaborators_by_pk',
  DELETE_PLAN_SNAPSHOT = 'delete_plan_snapshot_by_pk',
  DELETE_PLAN_TAGS = 'delete_plan_tags',
  DELETE_PRESET_TO_DIRECTIVE = 'delete_preset_to_directive_by_pk',
  DELETE_SCHEDULING_CONDITION_DEFINITION_TAGS = 'delete_scheduling_condition_definition_tags',
  DELETE_SCHEDULING_CONDITION_METADATA = 'delete_scheduling_condition_metadata_by_pk',
  DELETE_SCHEDULING_CONDITION_METADATA_TAGS = 'delete_scheduling_condition_tags',
  DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS = 'delete_scheduling_model_specification_conditions',
  DELETE_SCHEDULING_GOAL_DEFINITION_TAGS = 'delete_scheduling_goal_definition_tags',
  DELETE_SCHEDULING_GOAL_METADATA = 'delete_scheduling_goal_metadata_by_pk',
  DELETE_SCHEDULING_GOAL_METADATA_TAGS = 'delete_scheduling_goal_tags',
  DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS = 'delete_scheduling_model_specification_goals',
  DELETE_SCHEDULING_SPECIFICATION = 'delete_scheduling_specification',
  DELETE_SCHEDULING_SPECIFICATION_CONDITIONS = 'delete_scheduling_specification_conditions',
  DELETE_SCHEDULING_SPECIFICATION_GOALS = 'delete_scheduling_specification_goals',
  DELETE_SEQUENCE = 'delete_sequence_by_pk',
  DELETE_SEQUENCE_ADAPTATION = 'delete_sequence_adaptation_by_pk',
  DELETE_SEQUENCE_TO_SIMULATED_ACTIVITY = 'delete_sequence_to_simulated_activity_by_pk',
  DELETE_SIMULATION_TEMPLATE = 'delete_simulation_template_by_pk',
  DELETE_TAG = 'delete_tags_by_pk',
  DELETE_USER_SEQUENCE = 'delete_user_sequence_by_pk',
  DELETE_VIEW = 'delete_view_by_pk',
  DELETE_VIEWS = 'delete_view',
  DENY_MERGE = 'deny_merge',
  DUPLICATE_PLAN = 'duplicate_plan',
  EVENT = 'event',
  EXPAND_ALL_ACTIVITIES = 'expandAllActivities',
  EXPANSION_RULE = 'expansion_rule_by_pk',
  EXPANSION_RULES = 'expansion_rule',
  EXPANSION_RULE_TAGS = 'expansion_rule_tags',
  EXPANSION_RUNS = 'expansion_run',
  EXPANSION_SETS = 'expansion_set',
  EXTENSIONS = 'extensions',
  GET_ACTIVITY_EFFECTIVE_ARGUMENTS = 'getActivityEffectiveArguments',
  GET_ACTIVITY_TYPE_SCRIPT = 'getActivityTypeScript',
  GET_COMMAND_TYPE_SCRIPT = 'getCommandTypeScript',
  GET_CONFLICTING_ACTIVITIES = 'get_conflicting_activities',
  GET_EDSL_FOR_SEQ_JSON = 'getEdslForSeqJson',
  GET_MODEL_EFFECTIVE_ARGUMENTS = 'getModelEffectiveArguments',
  GET_NON_CONFLICTING_ACTIVITIES = 'get_non_conflicting_activities',
  GET_SEQUENCE_SEQ_JSON = 'getSequenceSeqJson',
  GET_USER_SEQUENCE_SEQ_JSON = 'getUserSequenceSeqJson',
  INSERT_ACTIVITY_DIRECTIVE = 'insert_activity_directive_one',
  INSERT_ACTIVITY_DIRECTIVE_TAGS = 'insert_activity_directive_tags',
  INSERT_ACTIVITY_PRESET = 'insert_activity_presets_one',
  INSERT_CHANNEL_DICTIONARY = 'insert_channel_dictionary_one',
  INSERT_DICTIONARY = 'insert_dictionary_one',
  INSERT_CONSTRAINT_DEFINITION = 'insert_constraint_definition_one',
  INSERT_CONSTRAINT_DEFINITION_TAGS = 'insert_constraint_definition_tags',
  INSERT_CONSTRAINT_METADATA = 'insert_constraint_metadata_one',
  INSERT_CONSTRAINT_MODEL_SPECIFICATION = 'insert_constraint_model_specification_one',
  INSERT_CONSTRAINT_MODEL_SPECIFICATIONS = 'insert_constraint_model_specification',
  INSERT_CONSTRAINT_SPECIFICATIONS = 'insert_constraint_specification',
  INSERT_CONSTRAINT_TAGS = 'insert_constraint_tags',
  INSERT_EXPANSION_RULE = 'insert_expansion_rule_one',
  INSERT_EXPANSION_RULE_TAGS = 'insert_expansion_rule_tags',
  INSERT_MISSION_MODEL = 'insert_mission_model_one',
  INSERT_PARAMETER_DICTIONARY = 'insert_parameter_dictionary_one',
  INSERT_PARCEL = 'insert_parcel_one',
  INSERT_PARCEL_TO_PARAMETER_DICTIONARY = 'insert_parcel_to_parameter_dictionary',
  INSERT_PLAN = 'insert_plan_one',
  INSERT_PLAN_SNAPSHOT_TAGS = 'insert_plan_snapshot_tags',
  INSERT_PLAN_COLLABORATORS = 'insert_plan_collaborators',
  INSERT_PLAN_TAGS = 'insert_plan_tags',
  INSERT_SCHEDULING_CONDITION_DEFINITION = 'insert_scheduling_condition_definition_one',
  INSERT_SCHEDULING_CONDITION_DEFINITION_TAGS = 'insert_scheduling_condition_definition_tags',
  INSERT_SCHEDULING_CONDITION_METADATA = 'insert_scheduling_condition_metadata_one',
  INSERT_SCHEDULING_CONDITION_TAGS = 'insert_scheduling_condition_tags',
  INSERT_SCHEDULING_GOAL_DEFINITION = 'insert_scheduling_goal_definition_one',
  INSERT_SCHEDULING_GOAL_DEFINITION_TAGS = 'insert_scheduling_goal_definition_tags',
  INSERT_SCHEDULING_GOAL_METADATA = 'insert_scheduling_goal_metadata_one',
  INSERT_SCHEDULING_GOAL_TAGS = 'insert_scheduling_goal_tags',
  INSERT_SCHEDULING_MODEL_SPECIFICATION_CONDITIONS = 'insert_scheduling_model_specification_conditions',
  INSERT_SCHEDULING_MODEL_SPECIFICATION_GOALS = 'insert_scheduling_model_specification_goals',
  INSERT_SCHEDULING_SPECIFICATION = 'insert_scheduling_specification_one',
  INSERT_SCHEDULING_SPECIFICATION_CONDITION = 'insert_scheduling_specification_conditions_one',
  INSERT_SCHEDULING_SPECIFICATION_CONDITIONS = 'insert_scheduling_specification_conditions',
  INSERT_SCHEDULING_SPECIFICATION_GOAL = 'insert_scheduling_specification_goals_one',
  INSERT_SCHEDULING_SPECIFICATION_GOALS = 'insert_scheduling_specification_goals',
  INSERT_SEQUENCE = 'insert_sequence_one',
  INSERT_SEQUENCE_ADAPTATION = 'insert_sequence_adaptation_one',
  INSERT_SEQUENCE_TO_SIMULATED_ACTIVITY = 'insert_sequence_to_simulated_activity_one',
  INSERT_SIMULATION_TEMPLATE = 'insert_simulation_template_one',
  INSERT_TAG = 'insert_tags_one',
  INSERT_TAGS = 'insert_tags',
  INSERT_USER_SEQUENCE = 'insert_user_sequence_one',
  INSERT_VIEW = 'insert_view_one',
  MERGE_REQUEST = 'merge_request_by_pk',
  MERGE_REQUESTS = 'merge_request',
  MISSION_MODEL = 'mission_model_by_pk',
  MISSION_MODELS = 'mission_model',
  PARAMETER_DICTIONARIES = 'parameter_dictionary',
  PARCEL = 'parcel_by_pk',
  PARCELS = 'parcel',
  PARCEL_TO_PARAMETER_DICTIONARY = 'parcel_to_parameter_dictionary',
  PLAN = 'plan_by_pk',
  PLANS = 'plan',
  PLAN_DATASETS = 'plan_dataset',
  PLAN_SNAPSHOTS = 'plan_snapshot',
  PLAN_SNAPSHOT_ACTIVITIES = 'plan_snapshot_activities',
  PROFILES = 'profile',
  RESOURCE_TYPES = 'resource_type',
  RESTORE_ACTIVITY_FROM_CHANGELOG = 'restoreActivityFromChangelog',
  RESTORE_FROM_SNAPSHOT = 'restore_from_snapshot',
  SCHEDULE = 'schedule',
  SCHEDULING_CONDITION_METADATA = 'scheduling_condition_metadata_by_pk',
  SCHEDULING_CONDITION_METADATAS = 'scheduling_condition_metadata',
  SCHEDULING_DSL_TYPESCRIPT = 'schedulingDslTypescript',
  SCHEDULING_GOAL_METADATA = 'scheduling_goal_metadata_by_pk',
  SCHEDULING_GOAL_METADATAS = 'scheduling_goal_metadata',
  SCHEDULING_REQUESTS = 'scheduling_request',
  SCHEDULING_SPECIFICATION = 'scheduling_specification_by_pk',
  SCHEDULING_SPECIFICATION_CONDITIONS = 'scheduling_specification_conditions',
  SCHEDULING_SPECIFICATION_GOALS = 'scheduling_specification_goals',
  SEQUENCE = 'sequence',
  SEQUENCE_ADAPTATION = 'sequence_adaptation',
  SEQUENCE_TO_SIMULATED_ACTIVITY = 'sequence_to_simulated_activity_by_pk',
  SET_RESOLUTION = 'set_resolution',
  SET_RESOLUTIONS = 'set_resolution_bulk',
  SIMULATE = 'simulate',
  SIMULATIONS = 'simulation',
  SIMULATION_DATASET = 'simulation_dataset_by_pk',
  SIMULATION_DATASETS = 'simulation_dataset',
  SIMULATION_TEMPLATES = 'simulation_template',
  SPANS = 'span',
  TAGS = 'tags',
  TOPIC = 'topic',
  UPDATE_ACTIVITY_DIRECTIVE = 'update_activity_directive_by_pk',
  UPDATE_ACTIVITY_PRESET = 'update_activity_presets_by_pk',
  UPDATE_CONSTRAINT_METADATA = 'update_constraint_metadata_by_pk',
  UPDATE_CONSTRAINT_SPECIFICATION = 'update_constraint_specification_by_pk',
  UPDATE_CONSTRAINT_MODEL_SPECIFICATION = 'update_constraint_model_specification_by_pk',
  UPDATE_EXPANSION_RULE = 'update_expansion_rule_by_pk',
  UPDATE_MISSION_MODEL = 'update_mission_model_by_pk',
  UPDATE_PARCEL = 'update_parcel_by_pk',
  UPDATE_PLAN_SNAPSHOT = 'update_plan_snapshot_by_pk',
  UPDATE_PLAN = 'update_plan_by_pk',
  UPDATE_SCHEDULING_CONDITION_METADATA = 'update_scheduling_condition_metadata_by_pk',
  UPDATE_SCHEDULING_GOAL_METADATA = 'update_scheduling_goal_metadata_by_pk',
  UPDATE_SCHEDULING_REQUEST = 'update_scheduling_request',
  UPDATE_SCHEDULING_SPECIFICATION = 'update_scheduling_specification_by_pk',
  UPDATE_SCHEDULING_SPECIFICATION_CONDITION = 'update_scheduling_specification_conditions_by_pk',
  UPDATE_SCHEDULING_SPECIFICATION_GOAL = 'update_scheduling_specification_goals_by_pk',
  UPDATE_SCHEDULING_CONDITION_MODEL_SPECIFICATION = 'update_scheduling_model_specification_conditions_by_pk',
  UPDATE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS = 'update_scheduling_model_specification_conditions',
  UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATION = 'update_scheduling_model_specification_goals_by_pk',
  UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS = 'update_scheduling_model_specification_goals',
  UPDATE_SIMULATION = 'update_simulation_by_pk',
  UPDATE_SIMULATIONS = 'update_simulation',
  UPDATE_SIMULATION_DATASET = 'update_simulation_dataset_by_pk',
  UPDATE_SIMULATION_TEMPLATE = 'update_simulation_template_by_pk',
  UPDATE_TAGS = 'update_tags_by_pk',
  UPDATE_USER_SEQUENCE = 'update_user_sequence_by_pk',
  UPDATE_VIEW = 'update_view_by_pk',
  UPLOADED_FILES = 'uploaded_file',
  UPLOAD_DICTIONARY = 'uploadDictionary',
  USER_ROLE_PERMISSION = 'user_role_permission',
  USER_SEQUENCE = 'user_sequence_by_pk',
  USER_SEQUENCES = 'user_sequence',
  USERS = 'users',
  VALIDATE_ACTIVITY_ARGUMENTS = 'validateActivityArguments',
  VIEW = 'view_by_pk',
  VIEWS = 'view',
  WITHDRAW_MERGE_REQUEST = 'withdraw_merge_request',
}

/**
 * GraphQL Query, Mutation, and Subscription strings.
 */
const gql = {
  APPLY_PRESET_TO_ACTIVITY: `#graphql
    mutation ApplyPresetToActivity($presetId: Int!, $activityId: Int!, $planId: Int!) {
      ${Queries.APPLY_PRESET_TO_ACTIVITY}(args: {
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
      ${Queries.UPDATE_SCHEDULING_REQUEST}(where: { analysis_id: { _eq: $id } }, _set: {
        canceled: true
      }) {
        affected_rows
      }
    }
  `,

  CANCEL_SIMULATION: `#graphql
    mutation CancelSim($id: Int!) {
      ${Queries.UPDATE_SIMULATION_DATASET}(pk_columns: {id: $id}, _set: {
        canceled: true
      }) {
        id
      }
    }
  `,

  CHECK_CONSTRAINTS: `#graphql
    query CheckConstraints($planId: Int!) {
      constraintResponses: ${Queries.CONSTRAINT_VIOLATIONS}(planId: $planId) {
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
      ${Queries.INSERT_ACTIVITY_DIRECTIVE}(object: $activityDirectiveInsertInput) {
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
      ${Queries.INSERT_ACTIVITY_DIRECTIVE_TAGS}(objects: $tags, on_conflict: {
        constraint: activity_directive_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_ACTIVITY_PRESET: `#graphql
    mutation CreateActivityPreset($activityPresetInsertInput: activity_presets_insert_input!) {
      ${Queries.INSERT_ACTIVITY_PRESET}(object: $activityPresetInsertInput) {
        arguments
        associated_activity_type
        id
        model_id
        name
        owner
      }
    }
  `,

  CREATE_CHANNEL_DICTIONARY: `#graphql
    mutation CreateChannelDictionary($channelDictionary: channel_dictionary_insert_input!) {
      createChannelDictionary: ${Queries.INSERT_CHANNEL_DICTIONARY}(object: $channelDictionary) {
        created_at
        id
        mission
        parsed_json
        version
      }
    }
  `,

  CREATE_CONSTRAINT: `#graphql
    mutation CreateConstraint($constraint: constraint_metadata_insert_input!) {
      constraint: ${Queries.INSERT_CONSTRAINT_METADATA}(object: $constraint) {
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
      constraintDefinition: ${Queries.INSERT_CONSTRAINT_DEFINITION}(object: $constraintDefinition) {
        constraint_id
        definition
        revision
      }
    }
  `,

  CREATE_CONSTRAINT_MODEL_SPECIFICATION: `#graphql
    mutation CreateConstraintModelSpecification($constraintModelSpecification: constraint_model_specification_insert_input!) {
      constraintModelSpecification: ${Queries.INSERT_CONSTRAINT_MODEL_SPECIFICATION}(object: $constraintModelSpecification) {
        constraint_id
        constraint_revision
        model_id
      }
    }
  `,

  CREATE_DICTIONARY: `#graphql
    mutation CreateDictionary($dictionary: String!, $type: String!) {
      createDictionary: ${Queries.UPLOAD_DICTIONARY}(dictionary: $dictionary, type : $type) {
        dictionary_path
        created_at
        id
        mission
        parsed_json
        version
        type
      }
    }
  `,

  CREATE_EXPANSION_RULE: `#graphql
    mutation CreateExpansionRule($rule: expansion_rule_insert_input!) {
      createExpansionRule: ${Queries.INSERT_EXPANSION_RULE}(object: $rule) {
        id
      }
    }
  `,

  CREATE_EXPANSION_RULE_TAGS: `#graphql
    mutation CreateExpansionRuleTags($tags: [expansion_rule_tags_insert_input!]!) {
      ${Queries.INSERT_EXPANSION_RULE_TAGS}(objects: $tags, on_conflict: {
        constraint: expansion_rule_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_EXPANSION_SEQUENCE: `#graphql
    mutation CreateExpansionSequence($sequence: sequence_insert_input!) {
      createExpansionSequence: ${Queries.INSERT_SEQUENCE}(object: $sequence) {
        seq_id
      }
    }
  `,

  CREATE_EXPANSION_SET: `#graphql
    mutation CreateExpansionSet($parcelId: Int!, $modelId: Int!, $expansionRuleIds: [Int!]!, $name: String,  $description: String) {
      ${Queries.CREATE_EXPANSION_SET}(
        missionModelId: $modelId,
        expansionIds: $expansionRuleIds,
        name: $name,
        description: $description
        parcelId : $parcelId
      ) {
        id
      }
    }
  `,

  CREATE_MODEL: `#graphql
    mutation CreateModel($model: mission_model_insert_input!) {
      createModel: ${Queries.INSERT_MISSION_MODEL}(object: $model) {
        created_at
        id
        owner
      }
    }
  `,

  CREATE_PARAMETER_DICTIONARY: `#graphql
    mutation CreateParameterDictionary($parameterDictionary: parameter_dictionary_insert_input!) {
      createParameterDictionary: ${Queries.INSERT_PARAMETER_DICTIONARY}(object: $parameterDictionary) {
        created_at
        id
        mission
        parsed_json
        version
      }
    }
  `,

  CREATE_PARCEL: `#graphql
    mutation CreateParcel($parcel: parcel_insert_input!) {
      createParcel: ${Queries.INSERT_PARCEL}(object: $parcel) {
        id
      }
    }
  `,

  CREATE_PARCEL_TO_PARAMETER_DICTIONARIES: `#graphql
    mutation CreateParcelToParameterDictionaries($parcelToParameterDictionaries : [parcel_to_parameter_dictionary_insert_input!]!) {
      ${Queries.INSERT_PARCEL_TO_PARAMETER_DICTIONARY}(objects: $parcelToParameterDictionaries) {
        affected_rows
        returning {
          parcel_id
          parameter_dictionary_id
        }
      }
    }
  `,

  CREATE_PLAN: `#graphql
    mutation CreatePlan($plan: plan_insert_input!) {
      createPlan: ${Queries.INSERT_PLAN}(object: $plan) {
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

  CREATE_PLAN_COLLABORATORS: `#graphql
    mutation CreatePlanCollaborators($collaborators: [plan_collaborators_insert_input!]!) {
      ${Queries.INSERT_PLAN_COLLABORATORS}(objects: $collaborators){
        affected_rows
      }
    }
`,

  CREATE_PLAN_MERGE_REQUEST: `#graphql
    mutation CreatePlanMergeRequest($source_plan_id: Int!, $target_plan_id: Int!) {
      ${Queries.CREATE_MERGE_REQUEST}(args: { source_plan_id: $source_plan_id, target_plan_id: $target_plan_id }) {
        merge_request_id
      }
    }
  `,

  CREATE_PLAN_SNAPSHOT: `#graphql
    mutation CreatePlanSnapshot($plan_id: Int!, $snapshot_name: String!, $description: String!) {
      createSnapshot: ${Queries.CREATE_SNAPSHOT}(args: { _plan_id: $plan_id, _snapshot_name: $snapshot_name, _description: $description } ) {
        snapshot_id
      }
    }
  `,

  CREATE_PLAN_SNAPSHOT_TAGS: `#graphql
    mutation CreatePlanSnapshotTags($tags: [plan_snapshot_tags_insert_input!]!) {
      ${Queries.INSERT_PLAN_SNAPSHOT_TAGS}(objects: $tags, on_conflict: {
        constraint: plan_snapshot_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_PLAN_TAGS: `#graphql
    mutation CreatePlanTags($tags: [plan_tags_insert_input!]!) {
      ${Queries.INSERT_PLAN_TAGS}(objects: $tags, on_conflict: {
        constraint: plan_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
    }
  `,

  CREATE_SCHEDULING_CONDITION: `#graphql
    mutation CreateSchedulingCondition($condition: scheduling_condition_metadata_insert_input!) {
      createSchedulingCondition: ${Queries.INSERT_SCHEDULING_CONDITION_METADATA}(object: $condition) {
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
      conditionDefinition: ${Queries.INSERT_SCHEDULING_CONDITION_DEFINITION}(object: $conditionDefinition) {
        condition_id
        definition
        revision
      }
    }
  `,

  CREATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION: `#graphql
    mutation CreateSchedulingSpecCondition($spec_condition: scheduling_specification_conditions_insert_input!) {
      createSchedulingSpecCondition: ${Queries.INSERT_SCHEDULING_SPECIFICATION_CONDITION}(object: $spec_condition) {
        enabled
        condition_id
        specification_id
      }
    }
  `,

  CREATE_SCHEDULING_GOAL: `#graphql
    mutation CreateSchedulingGoal($goal: scheduling_goal_metadata_insert_input!) {
      createSchedulingGoal: ${Queries.INSERT_SCHEDULING_GOAL_METADATA}(object: $goal) {
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
      goalDefinition: ${Queries.INSERT_SCHEDULING_GOAL_DEFINITION}(object: $goalDefinition) {
        goal_id
        definition
        revision
      }
    }
  `,

  CREATE_SCHEDULING_GOAL_PLAN_SPECIFICATION: `#graphql
    mutation CreateSchedulingSpecGoal($spec_goal: scheduling_specification_goals_insert_input!) {
      createSchedulingSpecGoal: ${Queries.INSERT_SCHEDULING_SPECIFICATION_GOAL}(object: $spec_goal) {
        enabled
        goal_id
        priority
        specification_id
      }
    }
  `,

  CREATE_SCHEDULING_PLAN_SPECIFICATION: `#graphql
    mutation CreateSchedulingSpec($spec: scheduling_specification_insert_input!) {
      createSchedulingSpec: ${Queries.INSERT_SCHEDULING_SPECIFICATION}(object: $spec) {
        id
      }
    }
  `,

  CREATE_SEQUENCE_ADAPTATION: `#graphql
    mutation CreateCustomAdaptation($adaptation: sequence_adaptation_insert_input!) {
      createSequenceAdaptation: ${Queries.INSERT_SEQUENCE_ADAPTATION}(object: $adaptation) {
        adaptation
        name
        created_at
      }
    }
  `,

  CREATE_SIMULATION_TEMPLATE: `#graphql
    mutation CreateSimulationTemplate($simulationTemplateInsertInput: simulation_template_insert_input!) {
      ${Queries.INSERT_SIMULATION_TEMPLATE}(object: $simulationTemplateInsertInput) {
        arguments
        description
        id
      }
    }
  `,

  CREATE_TAG: `#graphql
    mutation CreateTag($tag: tags_insert_input!) {
      ${Queries.INSERT_TAG}(object: $tag) {
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
      ${Queries.INSERT_TAGS}(objects: $tags, on_conflict: {
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
      createUserSequence: ${Queries.INSERT_USER_SEQUENCE}(object: $sequence) {
        id
      }
    }
  `,

  CREATE_VIEW: `#graphql
    mutation CreateView($view: view_insert_input!) {
      newView: ${Queries.INSERT_VIEW}(object: $view) {
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
      deleteActivityDirectives: ${Queries.DELETE_ACTIVITY_DIRECTIVES}(
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
      ${Queries.DELETE_ACTIVITY_REANCHOR_PLAN_START_BULK}(args: { _plan_id: $plan_id, _activity_ids: $activity_ids }) {
        change_type
        affected_row
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES_REANCHOR_TO_ANCHOR: `#graphql
    mutation DeleteActivityDirectivesReanchorToAnchor($plan_id: Int!, $activity_ids: _int4!) {
      ${Queries.DELETE_ACTIVITY_REANCHOR_TO_ANCHOR_BULK}(args: { _plan_id: $plan_id, _activity_ids: $activity_ids }) {
        change_type
        affected_row
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES_SUBTREE: `#graphql
    mutation DeleteActivityDirectivesSubtree($plan_id: Int!, $activity_ids: _int4!) {
      ${Queries.DELETE_ACTIVITY_DELETE_SUBTREE_BULK}(args: { _plan_id: $plan_id, _activity_ids: $activity_ids }) {
        change_type
        affected_row
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVE_TAGS: `#graphql
    mutation DeleteActivityDirectivesTags($ids: [Int!]!) {
        ${Queries.DELETE_ACTIVITY_DIRECTIVE_TAGS}(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_ACTIVITY_PRESET: `#graphql
    mutation DeleteActivityPreset($id: Int!) {
      deleteActivityPreset: ${Queries.DELETE_ACTIVITY_PRESET}(id: $id) {
        id
      }
    }
  `,

  DELETE_CHANNEL_DICTIONARY: `#graphql
    mutation DeleteChannelDictionary($id: Int!) {
      deleteChannelDictionary: ${Queries.DELETE_CHANNEL_DICTIONARY}(id: $id) {
        id
      }
    }
  `,

  DELETE_COMMAND_DICTIONARY: `#graphql
    mutation DeleteCommandDictionary($id: Int!) {
      deleteCommandDictionary: ${Queries.DELETE_COMMAND_DICTIONARY}(id: $id) {
        id
      }
    }
  `,

  DELETE_CONSTRAINT_METADATA: `#graphql
    mutation DeleteConstraint($id: Int!) {
      deleteConstraintMetadata: ${Queries.DELETE_CONSTRAINT_METADATA}(id: $id) {
        id
      }
    }
  `,

  DELETE_CONSTRAINT_MODEL_SPECIFICATIONS: `#graphql
    mutation DeleteConstraintModelSpecification($constraintIds: [Int!]!, $modelId: Int!) {
      ${Queries.DELETE_CONSTRAINT_MODEL_SPECIFICATIONS}(
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
      ${Queries.DELETE_CONSTRAINT_SPECIFICATIONS}(
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
      deleteExpansionRule: ${Queries.DELETE_EXPANSION_RULE}(id: $id) {
        id
      }
    }
  `,

  DELETE_EXPANSION_RULE_TAGS: `#graphql
    mutation DeleteExpansionRuleTags($ids: [Int!]!) {
        ${Queries.DELETE_EXPANSION_RULE_TAGS}(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_EXPANSION_SEQUENCE: `#graphql
    mutation DeleteExpansionSequence($seqId: String!, $simulationDatasetId: Int!) {
      deleteExpansionSequence: ${Queries.DELETE_SEQUENCE}(seq_id: $seqId, simulation_dataset_id: $simulationDatasetId) {
        seq_id
      }
    }
  `,

  DELETE_EXPANSION_SEQUENCE_TO_ACTIVITY: `#graphql
    mutation DeleteExpansionSequenceToActivity($simulation_dataset_id: Int!, $simulated_activity_id: Int!) {
      expansionSequence: ${Queries.DELETE_SEQUENCE_TO_SIMULATED_ACTIVITY}(
        simulation_dataset_id: $simulation_dataset_id,
        simulated_activity_id: $simulated_activity_id
      ) {
        seq_id
      }
    }
  `,

  DELETE_EXPANSION_SET: `#graphql
    mutation DeleteExpansionSet($id: Int!) {
      deleteExpansionSet: ${Queries.DELETE_EXPANSION_SET}(id: $id) {
        id
      }
    }
  `,

  DELETE_MODEL: `#graphql
    mutation DeleteModel($id: Int!) {
      deleteModel: ${Queries.DELETE_MISSION_MODEL}(id: $id) {
        id
      }
      deleteConstraintModelSpec: ${Queries.DELETE_CONSTRAINT_MODEL_SPECIFICATIONS}(where: { model_id: { _eq: $id } }) {
        returning {
          model_id
        }
      }
      deleteSchedulingConditionModelSpec: ${Queries.DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS}(where: { model_id: { _eq: $id } }) {
        returning {
          model_id
        }
      }
      deleteSchedulingGoalModelSpec: ${Queries.DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS}(where: { model_id: { _eq: $id } }) {
        returning {
          model_id
        }
      }
    }
  `,

  DELETE_PARAMETER_DICTIONARY: `#graphql
    mutation DeleteParameterDictionary($id: Int!) {
      deleteParameterDictionary: ${Queries.DELETE_PARAMETER_DICTIONARY}(id: $id) {
        id
      }
    }
  `,

  DELETE_PARCEL: `#graphql
    mutation DeleteParcel($id: Int!) {
      deleteParcel: ${Queries.DELETE_PARCEL}(id: $id) {
        id
      }
    }
  `,

  DELETE_PARCEL_TO_DICTIONARY_ASSOCIATION: `#graphql
    mutation deleteParcelToDictionaryAssociation($parameterDictionaryIds: [Int!]!, $parcelIds: [Int!]!) {
        ${Queries.DELETE_PARCEL_TO_DICTIONARY_ASSOCIATION}(where: { parcel_id: { _in: $parcelIds }, _and: { parameter_dictionary_id: { _in: $parameterDictionaryIds}}} ) {
          affected_rows
      }
    }
  `,

  DELETE_PLAN: `#graphql
    mutation DeletePlan($id: Int!) {
      deletePlan: ${Queries.DELETE_PLAN}(id: $id) {
        id
      }
      deleteSchedulingSpec: ${Queries.DELETE_SCHEDULING_SPECIFICATION}(where: { plan_id: { _eq: $id } }) {
        returning {
          id
        }
      }
    }
  `,

  DELETE_PLAN_COLLABORATOR: `#graphql
    mutation DeletePlanCollaborator($collaborator: String!, $planId: Int!) {
      deletePlanCollaborator: ${Queries.DELETE_PLAN_COLLABORATOR}(collaborator: $collaborator, plan_id: $planId) {
        collaborator
      }
    }
  `,

  DELETE_PLAN_SNAPSHOT: `#graphql
    mutation DeletePlanSnapshot($snapshot_id: Int!) {
      deletePlanSnapshot: ${Queries.DELETE_PLAN_SNAPSHOT}(snapshot_id: $snapshot_id) {
        snapshot_id
      }
    }
  `,

  DELETE_PLAN_TAGS: `#graphql
    mutation DeletePlanTags($ids: [Int!]!) {
        ${Queries.DELETE_PLAN_TAGS}(where: { tag_id: { _in: $ids } }) {
          affected_rows
      }
    }
  `,

  DELETE_PRESET_TO_DIRECTIVE: `#graphql
    mutation DeletePresetToDirective($plan_id: Int!, $activity_directive_id: Int!, $preset_id: Int!) {
      ${Queries.DELETE_PRESET_TO_DIRECTIVE}(preset_id: $preset_id, activity_id: $activity_directive_id, plan_id: $plan_id) {
        preset_id
      }
    }
  `,

  DELETE_SCHEDULING_CONDITION_METADATA: `#graphql
    mutation DeleteSchedulingCondition($id: Int!) {
      deleteSchedulingConditionMetadata: ${Queries.DELETE_SCHEDULING_CONDITION_METADATA}(id: $id) {
        id
      }
    }
  `,

  DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS: `#graphql
    mutation DeleteSchedulingConditionModelSpecification($conditionIds: [Int!]!, $modelId: Int!) {
      ${Queries.DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS}(
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
      ${Queries.DELETE_SCHEDULING_SPECIFICATION_CONDITIONS}(
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
      deleteSchedulingGoalMetadata: ${Queries.DELETE_SCHEDULING_GOAL_METADATA}(id: $id) {
        id
      }
    }
  `,

  DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS: `#graphql
    mutation DeleteSchedulingGoalModelSpecification($goalIds: [Int!]!, $modelId: Int!) {
      ${Queries.DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS}(
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
      ${Queries.DELETE_SCHEDULING_SPECIFICATION_GOALS}(
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

  DELETE_SEQUENCE_ADAPTATION: `#graphql
    mutation DeleteSequenceAdaptation($id: Int!) {
      deleteSequenceAdaptation: ${Queries.DELETE_SEQUENCE_ADAPTATION}(id: $id) {
        id
      }
    }
  `,

  DELETE_SIMULATION_TEMPLATE: `#graphql
    mutation DeleteSimulationTemplate($id: Int!) {
      deleteSimulationTemplate: ${Queries.DELETE_SIMULATION_TEMPLATE}(id: $id) {
        id
      }
    }
  `,

  DELETE_TAG: `#graphql
    mutation DeleteTags($id: Int!) {
      ${Queries.DELETE_TAG}(id: $id) {
        id
      }
    }
  `,

  DELETE_USER_SEQUENCE: `#graphql
    mutation DeleteUserSequence($id: Int!) {
      deleteUserSequence: ${Queries.DELETE_USER_SEQUENCE}(id: $id) {
        id
      }
    }
  `,

  DELETE_VIEW: `#graphql
    mutation DeleteView($id: Int!) {
      deletedView: ${Queries.DELETE_VIEW}(id: $id) {
        id
      }
    }
  `,

  DELETE_VIEWS: `#graphql
    mutation DeleteViews($ids: [Int!]!) {
      ${Queries.DELETE_VIEWS}(where: { id: { _in: $ids } }) {
        returning {
          id
        }
      }
    }
  `,

  DUPLICATE_PLAN: `#graphql
    mutation DuplicatePlan($plan_id: Int!, $new_plan_name: String!) {
      ${Queries.DUPLICATE_PLAN}(args: { new_plan_name: $new_plan_name, plan_id: $plan_id }) {
        new_plan_id
      }
    }
  `,

  EXPAND: `#graphql
    mutation Expand($expansionSetId: Int!, $simulationDatasetId: Int!) {
      expand: ${Queries.EXPAND_ALL_ACTIVITIES}(expansionSetId: $expansionSetId, simulationDatasetId: $simulationDatasetId) {
        id
      }
    }
  `,

  GET_ACTIVITY_DIRECTIVE_CHANGELOG: `#graphql
    query GetActivityTypesExpansionRules($activityId: Int!, $planId: Int!) {
      activityDirectiveRevisions: ${Queries.ACTIVITY_DIRECTIVE_CHANGELOG}(
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
      activity_types: ${Queries.ACTIVITY_TYPES}(where: { model_id: { _eq: $modelId } }) {
        expansion_rules {
          activity_type
          authoring_mission_model_id
          created_at
          expansion_logic
          id
          parcel_id
          updated_at
        }
        name
      }
    }
  `,

  GET_EFFECTIVE_ACTIVITY_ARGUMENTS: `#graphql
    query GetEffectiveActivityArguments($modelId: Int!, $activityTypeName: String!, $arguments: ActivityArguments!) {
      effectiveActivityArguments: ${Queries.GET_ACTIVITY_EFFECTIVE_ARGUMENTS}(
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
    query GetEffectiveModelArguments($modelId: Int!, $arguments: ModelArguments!) {
      effectiveModelArguments: ${Queries.GET_MODEL_EFFECTIVE_ARGUMENTS}(
        missionModelId: $modelId,
        modelArguments: $arguments
      ) {
        arguments
        errors
        success
      }
    }
  `,

  GET_EVENTS: `#graphql
    query GetEvents($datasetId: Int!) {
      topic(where: { dataset_id: { _eq: $datasetId }}) {
        name
        value_schema
        topic_index
      }
      event(where: { dataset_id: { _eq: $datasetId }}) {
        causal_time
        span_id
        real_time
        topic_index
        transaction_index
        value
      }
    }
  `,

  GET_EXPANSION_RULE: `#graphql
    query GetExpansionRule($id: Int!) {
      expansionRule: ${Queries.EXPANSION_RULE}(id: $id) {
        activity_type
        authoring_mission_model_id
        created_at
        description
        expansion_logic
        id
        name
        owner
        parcel_id
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
      expansionRuns: ${Queries.EXPANSION_RUNS}(order_by: { id: desc }) {
        created_at
        expansion_set {
          created_at
          id
          name
          parcel_id
        }
        expanded_sequences {
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
      expansionSequence: ${Queries.SEQUENCE_TO_SIMULATED_ACTIVITY}(
        simulation_dataset_id: $simulation_dataset_id,
        simulated_activity_id: $simulated_activity_id
      ) {
        seq_id
      }
    }
  `,

  GET_EXPANSION_SEQUENCE_SEQ_JSON: `#graphql
    query GetExpansionSequenceSeqJson($seqId: String!, $simulationDatasetId: Int!) {
      ${Queries.GET_SEQUENCE_SEQ_JSON}(seqId: $seqId, simulationDatasetId: $simulationDatasetId) {
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
      ${Queries.EXTENSIONS} {
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
      models: ${Queries.MISSION_MODELS} {
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

  GET_PARCEL: `#graphql
    query GetParcel($id: Int!) {
      parcel: ${Queries.PARCEL}(id: $id) {
        channel_dictionary_id
        command_dictionary_id
        created_at
        id
        name
        owner
        sequence_adaptation_id
        updated_at
      }
    }
  `,

  GET_PARSED_CHANNEL_DICTIONARY: `#graphql
    query GetParsedChannelDictionary($channelDictionaryId: Int!) {
      ${Queries.CHANNEL_DICTIONARIES}(where: { id: { _eq: $channelDictionaryId } }) {
        parsed_json
      }
    }
  `,

  GET_PARSED_COMMAND_DICTIONARY: `#graphql
    query GetParsedCommandDictionary($commandDictionaryId: Int!) {
      ${Queries.COMMAND_DICTIONARIES}(where: { id: { _eq: $commandDictionaryId } }) {
        parsed_json
      }
    }
  `,

  GET_PARSED_PARAMETER_DICTIONARY: `#graphql
    query GetParsedParameterDictionary($parameterDictionaryId: Int!) {
      ${Queries.PARAMETER_DICTIONARIES}(where: { id: { _eq: $parameterDictionaryId } }) {
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
      plan: ${Queries.PLAN}(id: $id) {
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
          refresh_activity_type_logs(order_by: { created_at: desc }, limit: 1) {
            error
            error_message
            pending
            success
          }
          refresh_resource_type_logs(order_by: { created_at: desc }, limit: 1) {
            error
            error_message
            pending
            success
          }
          refresh_model_parameter_logs(order_by: { created_at: desc }, limit: 1) {
            error
            error_message
            pending
            success
          }
          version
          view {
            created_at
            definition
            id
            name
            owner
            updated_at
          }
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
          id
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
      models: ${Queries.MISSION_MODELS}(order_by: { id: desc }) {
        id
        jar_id
        name
        plans {
          id
        }
        version
      }
      plans: ${Queries.PLANS}(order_by: { id: desc }) {
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

  GET_PLAN_MERGE_NON_CONFLICTING_ACTIVITIES: `#graphql
    query GetPlanMergeNonConflictingActivities($merge_request_id: Int!) {
      nonConflictingActivities: ${Queries.GET_NON_CONFLICTING_ACTIVITIES}(args: { _merge_request_id: $merge_request_id } ) {
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
      plan_snapshot_activity_directives: ${Queries.PLAN_SNAPSHOT_ACTIVITIES}(where: { snapshot_id: { _eq: $planSnapshotId } }, order_by: { start_offset: asc }) {
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
      ${Queries.PROFILES}(where: { _and: { dataset_id: { _eq: $datasetId }, name: { _eq: $name } } }, limit: 1) {
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
      ${Queries.PLAN_DATASETS}(where: { plan_id: { _eq: $planId }, _or: $simulationDatasetFilter }) {
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
    query GetResourceTypes($model_id: Int!, $limit: Int) {
      resource_types: ${Queries.RESOURCE_TYPES}(where: { model_id: { _eq: $model_id } }, order_by: { name: asc }, limit: $limit) {
        name
        schema
      }
    }
  `,

  GET_ROLE_PERMISSIONS: `#graphql
    query GetRolePermissions {
      rolePermissions: ${Queries.USER_ROLE_PERMISSION} {
        role
        action_permissions
        function_permissions
      }
    }
  `,

  GET_SCHEDULING_SPEC_CONDITIONS_FOR_CONDITION: `#graphql
    query GetSchedulingSpecConditionsForCondition($condition_id: Int!) {
      ${Queries.SCHEDULING_SPECIFICATION_CONDITIONS}(where: { condition_id: { _eq: $condition_id } }) {
        enabled
        condition_id
        specification_id
      }
    }
  `,

  GET_SCHEDULING_SPEC_GOALS_FOR_GOAL: `#graphql
    query GetSchedulingSpecGoalsForGoal($goal_id: Int!) {
      ${Queries.SCHEDULING_SPECIFICATION_GOALS}(where: { goal_id: { _eq: $goal_id } }) {
        enabled
        goal_id
        priority
        specification_id
      }
    }
  `,

  GET_SEQUENCE_ADAPTATION: `#graphql
    query GetSequenceAdaptation($sequence_adaptation_id: Int!) {
      ${Queries.SEQUENCE_ADAPTATION}(where: { id: { _eq: $sequence_adaptation_id }}) {
        adaptation
        name
      }
    }
  `,

  GET_SIMULATION_DATASET_ID: `#graphql
    query GetSimulationDatasetId($datasetId: Int!) {
      ${Queries.SIMULATION_DATASETS}(where: {dataset_id: {_eq: $datasetId}}) {
        id
      }
    }
  `,

  GET_SPANS: `#graphql
    query GetSpans($datasetId: Int!) {
      ${Queries.SPANS}(where: { dataset_id: { _eq: $datasetId } }, order_by: { start_offset: asc }) {
        attributes
        dataset_id
        duration
        span_id
        parent_id
        start_offset
        type
      }
    }
  `,

  GET_TYPESCRIPT_ACTIVITY_TYPE: `#graphql
    query GetTypeScriptActivityType($activityTypeName: String!, $modelId: Int!) {
      dslTypeScriptResponse: ${Queries.GET_ACTIVITY_TYPE_SCRIPT}(activityTypeName: $activityTypeName, missionModelId:$modelId) {
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
      dslTypeScriptResponse: ${Queries.GET_COMMAND_TYPE_SCRIPT}(commandDictionaryId: $commandDictionaryId) {
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
    query GetTypeScriptConstraints($model_id: Int!) {
      dslTypeScriptResponse: ${Queries.CONSTRAINTS_DSL_TYPESCRIPT}(missionModelId: $model_id) {
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
      dslTypeScriptResponse: ${Queries.SCHEDULING_DSL_TYPESCRIPT}(missionModelId: $model_id) {
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
      ${Queries.UPLOADED_FILES}(where: { id: { _eq: $id }}) {
        name
      }
    }
  `,

  GET_USER_SEQUENCE: `#graphql
    query GetUserSequence($id: Int!) {
      userSequence: ${Queries.USER_SEQUENCE}(id: $id) {
        created_at
        definition
        id
        name
        owner
        parcel_id
        updated_at
      }
    }
  `,

  GET_USER_SEQUENCE_FROM_SEQ_JSON: `#graphql
    query GetUserSequenceFromSeqJson($seqJson: SequenceSeqJson!) {
      sequence: ${Queries.GET_EDSL_FOR_SEQ_JSON}(seqJson: $seqJson)
    }
  `,

  GET_USER_SEQUENCE_SEQ_JSON: `#graphql
    query GetUserSequenceSeqJson($commandDictionaryId: Int!, $sequenceDefinition: String!) {
      ${Queries.GET_USER_SEQUENCE_SEQ_JSON}(commandDictionaryID: $commandDictionaryId, edslBody: $sequenceDefinition) {
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
      view: ${Queries.VIEW}(id: $id) {
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
    mutation InitialSimulationUpdate($plan_id: Int!, $simulation: simulation_set_input!) {
      ${Queries.UPDATE_SIMULATIONS}(where: {plan_id: {_eq: $plan_id}}, _set: $simulation) {
        returning {
          id
        }
      }
    }
  `,

  INSERT_EXPANSION_SEQUENCE_TO_ACTIVITY: `#graphql
    mutation InsertSequenceToActivity($input: sequence_to_simulated_activity_insert_input!) {
      sequence: ${Queries.INSERT_SEQUENCE_TO_SIMULATED_ACTIVITY}(
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
      ${Queries.BEGIN_MERGE}(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_CANCEL: `#graphql
    mutation PlanMergeCancel($merge_request_id: Int!) {
      ${Queries.CANCEL_MERGE}(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_COMMIT: `#graphql
    mutation PlanMergeCommit($merge_request_id: Int) {
      ${Queries.COMMIT_MERGE}(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_DENY: `#graphql
    mutation PlanMergeDeny($merge_request_id: Int) {
      ${Queries.DENY_MERGE}(args: { merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_REQUEST_WITHDRAW: `#graphql
    mutation PlanMergeRequestWithdraw($merge_request_id: Int!) {
      ${Queries.WITHDRAW_MERGE_REQUEST}(args: { _merge_request_id: $merge_request_id } ) {
        merge_request_id
      }
    }
  `,

  PLAN_MERGE_RESOLVE_ALL_CONFLICTS: `#graphql
    mutation PlanMergeResolveAllConflicts($merge_request_id: Int!, $resolution: resolution_type!) {
      ${Queries.SET_RESOLUTIONS} (
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
      ${Queries.SET_RESOLUTION}(
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
      ${Queries.RESTORE_ACTIVITY_FROM_CHANGELOG}(args: { _plan_id: $plan_id, _activity_directive_id: $activity_id, _revision: $revision }) {
        id
      }
    }
  `,

  RESTORE_PLAN_SNAPSHOT: `#graphql
    mutation RestorePlanSnapshot($plan_id: Int!, $snapshot_id: Int!) {
      ${Queries.RESTORE_FROM_SNAPSHOT}(args: { _plan_id: $plan_id, _snapshot_id: $snapshot_id }) {
        snapshot_id
      }
    }
  `,

  SCHEDULE: `#graphql
    query Schedule($specificationId: Int!) {
      ${Queries.SCHEDULE}(specificationId: $specificationId) {
        reason
        analysisId
      }
    }
  `,

  SIMULATE: `#graphql
    query Simulate($planId: Int!, $force: Boolean!) {
      ${Queries.SIMULATE}(planId: $planId, force: $force) {
        reason
        simulationDatasetId
        status
      }
    }
  `,

  SUB_ACTIVITY_DIRECTIVES: `#graphql
    subscription SubActivityDirectives($planId: Int!) {
      activity_directives: ${Queries.ACTIVITY_DIRECTIVES}(where: { plan_id: { _eq: $planId } }, order_by: { start_offset: asc }) {
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
      ${Queries.ACTIVITY_DIRECTIVE_METADATA_SCHEMAS}(order_by: { key: asc }) {
        key
        schema
      }
    }
  `,

  SUB_ACTIVITY_DIRECTIVE_VALIDATIONS: `#graphql
    subscription SubActivityDirectiveValidationErrors($planId: Int!) {
      ${Queries.ACTIVITY_DIRECTIVE_VALIDATIONS}(where: {
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
      ${Queries.ACTIVITY_PRESETS}(where: {
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
      ${Queries.ACTIVITY_TYPES}(where: { model_id: { _eq: $modelId } }, order_by: { name: asc }) {
        computed_attributes_value_schema
        name
        parameters
        required_parameters
      }
    }
  `,

  SUB_ANCHOR_VALIDATION_STATUS: `#graphql
    subscription SubAnchorValidationStatus($planId: Int!) {
      anchor_validation_status: ${Queries.ANCHOR_VALIDATION_STATUS}(where: { plan_id: { _eq: $planId } }) {
        activity_id,
        plan_id,
        reason_invalid
      }
    }
  `,

  SUB_CHANNEL_DICTIONARIES: `#graphql
    subscription SubChannelDictionaries {
      ${Queries.CHANNEL_DICTIONARIES}(order_by: { id: desc }) {
        created_at
        id
        mission
        version
        created_at
        updated_at
      }
    }
  `,

  SUB_COMMAND_DICTIONARIES: `#graphql
    subscription SubCommandDictionaries {
      ${Queries.COMMAND_DICTIONARIES}(order_by: { id: desc }) {
        created_at
        id
        mission
        version
      }
    }
  `,

  SUB_CONSTRAINT: `#graphql
    subscription SubConstraint($id: Int!) {
      constraint: ${Queries.CONSTRAINT_METADATA}(id: $id) {
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
        versions(order_by: {revision: desc}) {
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
      constraints: ${Queries.CONSTRAINT_METADATAS}(order_by: { name: asc }) {
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
        versions(order_by: {revision: desc}) {
          author
          definition
          revision
        }
      }
    }
  `,

  SUB_CONSTRAINT_DEFINITION: `#graphql
    subscription SubConstraintDefinition($id: Int!, $revision: Int!) {
      constraintDefinition: ${Queries.CONSTRAINT_DEFINITION}(constraint_id: $id, revision: $revision) {
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
      constraintPlanSpecs: ${Queries.CONSTRAINT_SPECIFICATIONS}(
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
      expansionRules: ${Queries.EXPANSION_RULES}(order_by: { id: desc }) {
        activity_type
        authoring_mission_model_id
        created_at
        description
        expansion_logic
        id
        name
        owner
        parcel_id
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
      expansionRuleTags: ${Queries.EXPANSION_RULE_TAGS}(order_by: { rule_id: desc }) {
        rule_id
        tag_id
      }
    }
  `,

  SUB_EXPANSION_SEQUENCES: `#graphql
    subscription SubExpansionSequences {
      ${Queries.SEQUENCE} {
        created_at
        metadata
        seq_id
        simulation_dataset_id
      }
    }
  `,

  SUB_EXPANSION_SETS: `#graphql
    subscription SubExpansionSets {
      expansionSets: ${Queries.EXPANSION_SETS}(order_by: { id: desc }) {
        created_at
        description
        expansion_rules {
          activity_type
          authoring_mission_model_id
          expansion_logic
          id
          owner
          parcel_id
        }
        id
        mission_model_id
        name
        owner
        parcel_id
        updated_at
        updated_by
      }
    }
  `,

  SUB_MODEL: `#graphql
    subscription SubModel($id: Int!) {
      model: ${Queries.MISSION_MODEL}(id: $id) {
        constraint_specification {
          constraint_id
          constraint_revision
          constraint_definition {
            definition
            tags {
              tag_id
            }
          }
          constraint_metadata {
            id
            name
          }
        }
        created_at
        description
        jar_id
        id
        mission
        name
        owner
        plans {
          id
        }
        refresh_activity_type_logs(order_by: { created_at: desc }, limit: 1) {
          error
          error_message
          pending
          success
        }
        refresh_resource_type_logs(order_by: { created_at: desc }, limit: 1) {
          error
          error_message
          pending
          success
        }
        refresh_model_parameter_logs(order_by: { created_at: desc }, limit: 1) {
          error
          error_message
          pending
          success
        }
        scheduling_specification_conditions {
          condition_id
          condition_revision
          condition_definition {
            definition
            tags {
              tag_id
            }
          }
          condition_metadata {
            id
            name
          }
        }
        scheduling_specification_goals {
          goal_id
          goal_revision
          goal_definition {
            definition
            tags {
              tag_id
            }
          }
          goal_metadata {
            id
            name
          }
          priority
        }
        version
      }
    }
  `,

  SUB_MODELS: `#graphql
    subscription SubModels {
      models: ${Queries.MISSION_MODELS}(order_by: { name: asc }) {
        created_at
        description
        id
        jar_id
        name
        plans {
          id
        }
        owner
        refresh_activity_type_logs(order_by: { created_at: desc }, limit: 1) {
          error
          error_message
          pending
          success
        }
        refresh_resource_type_logs(order_by: { created_at: desc }, limit: 1) {
          error
          error_message
          pending
          success
        }
        refresh_model_parameter_logs(order_by: { created_at: desc }, limit: 1) {
          error
          error_message
          pending
          success
        }
        version
      }
    }
  `,

  SUB_PARAMETER_DICTIONARIES: `#graphql
    subscription SubParameterDictionaries {
      ${Queries.PARAMETER_DICTIONARIES}(order_by: { id: desc }) {
        created_at
        id
        mission
        updated_at
        version
      }
    }
  `,

  SUB_PARCELS: `#graphql
    subscription SubParcels {
      ${Queries.PARCELS}(order_by: { id: desc }) {
        channel_dictionary_id
        command_dictionary_id
        created_at
        id
        name
        sequence_adaptation_id
        updated_at
      }
    }
  `,

  SUB_PARCEL_TO_PARAMETER_DICTIONARIES: `#graphql
    subscription SubParcelsToParameterDictionaries {
      ${Queries.PARCEL_TO_PARAMETER_DICTIONARY} {
        parameter_dictionary_id
        parcel_id
      }
    }
  `,

  SUB_PLANS: `#graphql
    subscription SubPlans {
      plans: ${Queries.PLANS}(order_by: { id: desc }) {
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

  SUB_PLANS_USER_WRITABLE: `#graphql
    subscription SubPlansUserWritable($userId: String!) {
      ${Queries.PLANS}(where: {_or: [{owner: {_eq: $userId}}, {collaborators: {collaborator: {_eq: $userId}}}]}, order_by: {id: desc}) {
        collaborators {
          collaborator
        }
        id
        name
        owner
        updated_at
        updated_by
      }
    }
  `,

  SUB_PLAN_DATASET: `#graphql
    subscription SubPlanDatasets($planId: Int!) {
      ${Queries.PLAN_DATASETS}(where: {plan_id: {_eq: $planId}}) {
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
      planLocked: ${Queries.PLAN}(id: $planId) {
        is_locked
      }
    }
  `,

  SUB_PLAN_MERGE_CONFLICTING_ACTIVITIES: `#graphql
    subscription SubPlanMergeConflictingActivities($merge_request_id: Int!) {
      conflictingActivities: ${Queries.GET_CONFLICTING_ACTIVITIES}(args: { _merge_request_id: $merge_request_id } ) {
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
      ${Queries.MERGE_REQUESTS}(where: { plan_id_receiving_changes: { _eq: $planId } }, order_by: { id: desc }) {
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
      ${Queries.MERGE_REQUESTS}(where: { plan_snapshot_supplying_changes: { plan_id: { _eq: $planId } } }, order_by: { id: desc }) {
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
      merge_requests: ${Queries.MERGE_REQUESTS}(where: { _and: [{ plan_id_receiving_changes: { _eq: $planId } }, { status: { _eq: "in-progress" } }] }, limit: 1 ) {
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
      merge_request: ${Queries.MERGE_REQUEST}(id: $mergeRequestId) {
        status
      }
    }
  `,

  SUB_PLAN_METADATA: `#graphql
    subscription SubPlanMetadata($planId: Int!) {
      merge_request: ${Queries.PLAN}(id: $planId) {
        id
        name
        owner
        updated_at
        updated_by
        created_at
        collaborators {
          collaborator
        }
      }
    }
  `,

  SUB_PLAN_REVISION: `#graphql
    subscription SubPlanRevision($planId: Int!) {
      plan: ${Queries.PLAN}(id: $planId) {
        revision
      }
    }
  `,

  SUB_PLAN_SNAPSHOTS: `#graphql
    subscription SubPlanSnapshot($planId: Int!) {
      plan_snapshots: ${Queries.PLAN_SNAPSHOTS}(where: { plan_id: { _eq: $planId } }, order_by: { taken_at: desc }) {
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
      plan: ${Queries.PLAN}(id: $planId) {
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
      condition: ${Queries.SCHEDULING_CONDITION_METADATA}(id: $id) {
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
        versions(order_by: {revision: desc}) {
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
      conditions: ${Queries.SCHEDULING_CONDITION_METADATAS}(order_by: { name: asc }) {
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
        versions(order_by: {revision: desc}) {
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
      goal: ${Queries.SCHEDULING_GOAL_METADATA}(id: $id) {
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
        versions(order_by: {revision: desc}) {
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
      goals: ${Queries.SCHEDULING_GOAL_METADATAS}(order_by: { name: asc }) {
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
        versions(order_by: {revision: desc}) {
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
      schedulingPlanSpec: ${Queries.SCHEDULING_SPECIFICATION}(id: $specificationId) {
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
      ${Queries.SCHEDULING_REQUESTS}(where: { specification_id: { _eq: $specId } }, order_by: { analysis_id: desc }) {
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

  SUB_SEQUENCE_ADAPTATIONS: `#graphql
    subscription SubSequenceAdaptations {
      ${Queries.SEQUENCE_ADAPTATION}(order_by: { id: desc }) {
        adaptation
        created_at
        id
        name
        updated_by
      }
    }
  `,

  SUB_SIMULATION: `#graphql
    subscription SubSimulation($planId: Int!) {
      ${Queries.SIMULATIONS}(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
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
      ${Queries.SIMULATION_DATASET}(id: $simulationDatasetId) {
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
      ${Queries.SIMULATIONS}(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }) {
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
      ${Queries.SIMULATION_DATASETS}(order_by: { id: desc }) {
        canceled
        id
        status
      }
    }
  `,

  SUB_SIMULATION_DATASET_LATEST: `#graphql
    subscription SubSimulationDatasetLatest($planId: Int!) {
      ${Queries.SIMULATIONS}(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
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
      templates: ${Queries.SIMULATION_TEMPLATES}(where: { model_id: { _eq: $modelId } }) {
        arguments
        description
        id
        owner
      }
    }
  `,

  SUB_TAGS: `#graphql
    subscription SubTags {
      ${Queries.TAGS}(order_by: { name: desc })  {
        color
        created_at
        id
        name
        owner
      }
    }
  `,

  SUB_USERS: `#graphql
    subscription SubUsers {
      ${Queries.USERS}(order_by: { username: desc }) {
        username
      }
    }
  `,

  SUB_USER_SEQUENCES: `#graphql
    subscription SubUserSequences {
      ${Queries.USER_SEQUENCES}(order_by: { id: desc }) {
        created_at
        definition
        id
        name
        owner
        parcel_id
        updated_at
      }
    }
  `,

  SUB_VIEWS: `#graphql
    subscription SubViews {
      views: ${Queries.VIEWS} {
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
      ${Queries.UPDATE_ACTIVITY_DIRECTIVE}(
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
      ${Queries.UPDATE_ACTIVITY_PRESET}(
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
      insertConstraintDefinitionTags: ${Queries.INSERT_CONSTRAINT_DEFINITION_TAGS}(objects: $tags, on_conflict: {
        constraint: constraint_definition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteConstraintDefinitionTags: ${Queries.DELETE_CONSTRAINT_DEFINITION_TAGS}(
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
      updateConstraintMetadata: ${Queries.UPDATE_CONSTRAINT_METADATA}(
        pk_columns: { id: $id }, _set: $constraintMetadata
      ) {
        id
      }
      insertConstraintTags: ${Queries.INSERT_CONSTRAINT_TAGS}(objects: $tags, on_conflict: {
        constraint: constraint_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteConstraintTags: ${Queries.DELETE_CONSTRAINT_TAGS}(where: { tag_id: { _in: $tagIdsToDelete } }) {
          affected_rows
      }
    }
  `,

  UPDATE_CONSTRAINT_MODEL_SPECIFICATIONS: `#graphql
    mutation UpdateConstraintModelSpecifications($constraintSpecsToUpdate: [constraint_model_specification_insert_input!]!, $constraintIdsToDelete: [Int!]! = [], $modelId: Int!) {
      updateConstraintModelSpecifications: ${Queries.INSERT_CONSTRAINT_MODEL_SPECIFICATIONS}(
        objects: $constraintSpecsToUpdate,
        on_conflict: {
          constraint: constraint_model_spec_pkey,
          update_columns: [constraint_revision]
        },
      ) {
        returning {
          constraint_revision
        }
      }
      deleteConstraintModelSpecifications: ${Queries.DELETE_CONSTRAINT_MODEL_SPECIFICATIONS}(
        where: {
          constraint_id: { _in: $constraintIdsToDelete },
          _and: {
            model_id: { _eq: $modelId },
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_CONSTRAINT_PLAN_SPECIFICATION: `#graphql
    mutation UpdateConstraintPlanSpecification($id: Int!, $revision: Int!, $enabled: Boolean!, $planId: Int!) {
      updateConstraintPlanSpecification: ${Queries.UPDATE_CONSTRAINT_SPECIFICATION}(
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
      updateConstraintPlanSpecifications: ${Queries.INSERT_CONSTRAINT_SPECIFICATIONS}(
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
      deleteConstraintPlanSpecifications: ${Queries.DELETE_CONSTRAINT_SPECIFICATIONS}(
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
      updateExpansionRule: ${Queries.UPDATE_EXPANSION_RULE}(
        pk_columns: { id: $id }, _set: $rule
      ) {
        updated_at
      }
    }
  `,

  UPDATE_MODEL: `#graphql
    mutation UpdateModel($id: Int!, $model: mission_model_set_input!) {
      updateModel: ${Queries.UPDATE_MISSION_MODEL}(
        pk_columns: { id: $id }, _set: $model
      ) {
        id
        description
        name
        version
        owner
      }
    }
  `,

  UPDATE_PARCEL: `#graphql
    mutation UpdateParcel($id: Int!, $parcel: parcel_set_input!) {
      updateParcel: ${Queries.UPDATE_PARCEL}(
        pk_columns: { id: $id }, _set: $parcel
      ) {
        id
      }
    }
  `,

  UPDATE_PLAN: `#graphql
    mutation UpdatePlan($plan_id: Int!, $plan: plan_set_input!) {
      updatePlan: ${Queries.UPDATE_PLAN}(
        pk_columns: { id: $plan_id }, _set: $plan
      ) {
        id
      }
    }
  `,

  UPDATE_PLAN_SNAPSHOT: `#graphql
    mutation UpdatePlanSnapshot($snapshot_id: Int!, $planSnapshot: plan_snapshot_set_input!) {
      updatePlanSnapshot: ${Queries.UPDATE_PLAN_SNAPSHOT}(
        pk_columns: { snapshot_id: $snapshot_id }, _set: $planSnapshot
      ) {
        snapshot_id
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_DEFINITION_TAGS: `#graphql
    mutation UpdateSchedulingConditionTags($conditionId: Int!, $conditionRevision: Int!, $tags: [scheduling_condition_definition_tags_insert_input!]!, $tagIdsToDelete: [Int!]!) {
      insertSchedulingConditionDefinitionTags: ${Queries.INSERT_SCHEDULING_CONDITION_DEFINITION_TAGS}(objects: $tags, on_conflict: {
        constraint: scheduling_condition_definition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingConditionDefinitionTags: ${Queries.DELETE_SCHEDULING_CONDITION_DEFINITION_TAGS}(
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
      updateSchedulingConditionMetadata: ${Queries.UPDATE_SCHEDULING_CONDITION_METADATA}(
        pk_columns: { id: $id }, _set: $conditionMetadata
      ) {
        id
      }
      insertSchedulingConditionTags: ${Queries.INSERT_SCHEDULING_CONDITION_TAGS}(objects: $tags, on_conflict: {
        constraint: scheduling_condition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingConditionTags: ${Queries.DELETE_SCHEDULING_CONDITION_METADATA_TAGS}(where: { tag_id: { _in: $tagIdsToDelete } }) {
          affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS: `#graphql
    mutation UpdateSchedulingConditionModelSpecifications($conditionSpecsToUpdate: [scheduling_model_specification_conditions_insert_input!]!, $conditionIdsToDelete: [Int!]! = [], $modelId: Int!) {
      updateSchedulingConditionModelSpecifications: ${Queries.INSERT_SCHEDULING_MODEL_SPECIFICATION_CONDITIONS}(
        objects: $conditionSpecsToUpdate,
        on_conflict: {
          constraint: scheduling_model_specification_conditions_pkey,
          update_columns: [condition_revision]
        },
      ) {
        returning {
          condition_revision
        }
      }
      deleteSchedulingConditionModelSpecifications: ${Queries.DELETE_SCHEDULING_CONDITION_MODEL_SPECIFICATIONS}(
        where: {
          condition_id: { _in: $conditionIdsToDelete },
          _and: {
            model_id: { _eq: $modelId }
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_CONDITION_PLAN_SPECIFICATION: `#graphql
    mutation UpdateSchedulingConditionPlanSpecification($id: Int!, $revision: Int!, $enabled: Boolean!, $specificationId: Int!) {
      updateSchedulingConditionPlanSpecification: ${Queries.UPDATE_SCHEDULING_SPECIFICATION_CONDITION}(
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
      updateSchedulingConditionPlanSpecifications: ${Queries.INSERT_SCHEDULING_SPECIFICATION_CONDITIONS}(
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
      deleteSchedulingConditionPlanSpecifications: ${Queries.DELETE_SCHEDULING_SPECIFICATION_CONDITIONS}(
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
      insertSchedulingGoalDefinitionTags: ${Queries.INSERT_SCHEDULING_GOAL_DEFINITION_TAGS}(objects: $tags, on_conflict: {
        constraint: scheduling_goal_definition_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingGoalDefinitionTags: ${Queries.DELETE_SCHEDULING_GOAL_DEFINITION_TAGS}(
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
      updateSchedulingGoalMetadata: ${Queries.UPDATE_SCHEDULING_GOAL_METADATA}(
        pk_columns: { id: $id }, _set: $goalMetadata
      ) {
        id
      }
      insertSchedulingGoalTags: ${Queries.INSERT_SCHEDULING_GOAL_TAGS}(objects: $tags, on_conflict: {
        constraint: scheduling_goal_tags_pkey,
        update_columns: []
      }) {
        affected_rows
      }
      deleteSchedulingGoalTags: ${Queries.DELETE_SCHEDULING_GOAL_METADATA_TAGS}(where: { tag_id: { _in: $tagIdsToDelete } }) {
          affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATION: `#graphql
    mutation UpdateSchedulingGoalModelSpecification($id: Int!, $revision: Int!, $priority: Int!, $modelId: Int!) {
      updateSchedulingGoalModelSpecification: ${Queries.UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATION}(
        pk_columns: { goal_id: $id, model_id: $modelId },
        _set: {
          goal_revision: $revision,
          priority: $priority,
        }
      ) {
        goal_revision
      }
    }
  `,
  UPDATE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS: `#graphql
    mutation UpdateSchedulingGoalModelSpecifications($goalSpecsToUpdate: [scheduling_model_specification_goals_insert_input!]!, $goalIdsToDelete: [Int!]! = [], $modelId: Int!) {
      updateSchedulingGoalModelSpecifications: ${Queries.INSERT_SCHEDULING_MODEL_SPECIFICATION_GOALS}(
        objects: $goalSpecsToUpdate,
        on_conflict: {
          constraint: scheduling_model_specification_goals_pkey,
          update_columns: [goal_revision]
        },
      ) {
        returning {
          goal_revision
        }
      }
      deleteSchedulingGoalModelSpecifications: ${Queries.DELETE_SCHEDULING_GOAL_MODEL_SPECIFICATIONS}(
        where: {
          goal_id: { _in: $goalIdsToDelete },
          _and: {
            model_id: { _eq: $modelId }
          }
        }
      ) {
        affected_rows
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL_PLAN_SPECIFICATION: `#graphql
    mutation UpdateSchedulingGoalPlanSpecification($id: Int!, $revision: Int!, $enabled: Boolean!, $priority: Int!, $simulateAfter: Boolean!, $specificationId: Int!) {
      updateSchedulingGoalPlanSpecification: ${Queries.UPDATE_SCHEDULING_SPECIFICATION_GOAL}(
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
      updateSchedulingGoalPlanSpecifications: ${Queries.INSERT_SCHEDULING_SPECIFICATION_GOALS}(
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
      deleteSchedulingGoalPlanSpecifications: ${Queries.DELETE_SCHEDULING_SPECIFICATION_GOALS}(
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

  UPDATE_SCHEDULING_SPECIFICATION: `#graphql
    mutation UpdateSchedulingSpec($id: Int!, $spec: scheduling_specification_set_input!) {
      updateSchedulingSpec: ${Queries.UPDATE_SCHEDULING_SPECIFICATION}(
        pk_columns: { id: $id }, _set: $spec
      ) {
        id
      }
    }
  `,

  UPDATE_SIMULATION: `#graphql
    mutation UpdateSimulation($id: Int!, $simulation: simulation_set_input!) {
      updateSimulation: ${Queries.UPDATE_SIMULATION}(
        pk_columns: { id: $id }, _set: $simulation
      ) {
        id
      }
    }
  `,

  UPDATE_SIMULATION_TEMPLATE: `#graphql
    mutation UpdateSimulationTemplate($id: Int!, $simulationTemplateSetInput: simulation_template_set_input!) {
      ${Queries.UPDATE_SIMULATION_TEMPLATE}(pk_columns: {id: $id}, _set: $simulationTemplateSetInput) {
        id
        description
        arguments
      }
    }
  `,

  UPDATE_TAG: `#graphql
    mutation UpdateTag($id: Int!, $tagSetInput: tags_set_input!) {
      ${Queries.UPDATE_TAGS}(pk_columns: {id: $id}, _set: $tagSetInput) {
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
      updateUserSequence: ${Queries.UPDATE_USER_SEQUENCE}(
        pk_columns: { id: $id }, _set: $sequence
      ) {
        id
        updated_at
      }
    }
  `,

  UPDATE_VIEW: `#graphql
    mutation UpdateView($id: Int!, $view: view_set_input!) {
      updatedView: ${Queries.UPDATE_VIEW}(
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
    query ValidateActivityArguments($arguments: ActivityArguments!, $activityTypeName: String!, $modelId: Int!) {
      ${Queries.VALIDATE_ACTIVITY_ARGUMENTS}(
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
