/**
 * GraphQL Query, Mutation, and Subscription strings.
 */
const gql = {
  CHECK_CONSTRAINTS: `#graphql
    query CheckConstraints($planId: Int!) {
      checkConstraintsResponse: constraintViolations(planId: $planId) {
        violationsMap: constraintViolations
      }
    }
  `,

  CREATE_ACTIVITY_DIRECTIVE: `#graphql
    mutation CreateActivityDirective($activityDirectiveInsertInput: activity_directive_insert_input!) {
      createActivityDirective: insert_activity_directive_one(object: $activityDirectiveInsertInput) {
        id
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
    mutation CreateConstraint($constraint: condition_insert_input!) {
      createConstraint: insert_condition_one(object: $constraint) {
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

  CREATE_SIMULATION: `#graphql
    mutation CreateSimulation($simulation: simulation_insert_input!) {
      createSimulation: insert_simulation_one(object: $simulation) {
        id
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
    mutation DeleteActivityDirective($id: Int!) {
      deleteActivityDirective: delete_activity_directive_by_pk(id: $id) {
        id
      }
    }
  `,

  DELETE_ACTIVITY_DIRECTIVES: `#graphql
    mutation DeleteActivityDirectives($ids: [Int!]!) {
      deleteActivityDirectives: delete_activity_directive(where: { id: { _in: $ids } }) {
        returning {
          id
        }
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
      deleteConstraint: delete_condition_by_pk(id: $id) {
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

  DELETE_SCHEDULING_GOAL: `#graphql
    mutation DeleteSchedulingGoal($id: Int!) {
      deleteSchedulingGoal: delete_scheduling_goal_by_pk(id: $id) {
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
      constraint: condition_by_pk(id: $id) {
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
        seqJson {
          id
          metadata
          steps {
            args
            metadata
            stem
            time {
              tag
              type
            }
            type
          }
        }
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
        duration
        id
        model: mission_model {
          activity_types(order_by: { name: asc }) {
            computed_attributes_value_schema
            name
            parameters
            required_parameters
          }
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
    query GetUserSequenceFromSeqJson($seqJson: SequenceSeqJsonInput!) {
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
        seqJson {
          id
          metadata
          steps {
            args
            metadata
            stem
            time {
              tag
              type
            }
            type
          }
        }
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

  GET_VIEWS_LATEST: `#graphql
    query GetViewsLatest($owner: String!) {
      views: view(
        where: { _or: [{ owner: { _eq: $owner } }, { owner: { _eq: "system" } }] },
        order_by: { updated_at: desc }
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

  SUB_ACTIVITIES: `#graphql
    subscription SubActivities($planId: Int!, $simulationDatasetId: Int!) {
      plan_by_pk(id: $planId) {
        activity_directives {
          arguments
          created_at
          id
          last_modified_at
          metadata
          name
          simulated_activities(where: { simulation_dataset_id: { _eq: $simulationDatasetId } }, order_by: { id: desc }, limit: 1) {
            activity_type_name
            attributes
            duration
            id
            parent_id
            simulation_dataset_id
            start_offset
          }
          source_scheduling_goal_id
          start_offset
          tags
          type
        }
        simulations(order_by: { id: desc }, limit: 1) {
          simulation_datasets(where: { id: { _eq: $simulationDatasetId } }, limit: 1) {
            simulated_activities(where: { parent_id: {  _is_null: false } }) {
              activity_type_name
              attributes
              duration
              id
              parent_id
              simulation_dataset_id
              start_offset
            }
          }
        }
        start_time
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

  SUB_ACTIVITY_TYPE_NAMES: `#graphql
    subscription SubActivityTypeNames($modelId: Int!) {
      activity_types: activity_type(where: { model_id: { _eq: $modelId } }) {
        name
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
      constraints: condition(where: {
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
      constraints: condition(order_by: { name: asc }) {
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

  SUB_PLAN_REVISION: `#graphql
    subscription SubPlanRevision($planId: Int!) {
      plan: plan_by_pk(id: $planId) {
        revision
      }
    }
  `,

  SUB_PROFILES_EXTERNAL: `#graphql
    subscription SubProfilesExternal($planId: Int!) {
      plan: plan_by_pk(id: $planId) {
        datasets {
          dataset {
            profiles {
              name
              profile_segments {
                dynamics
                start_offset
              }
              type
            }
          }
          offset_from_plan_start
        }
        duration
        start_time
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

  SUB_SCHEDULING_SPEC_GOALS: `#graphql
    subscription SubSchedulingSpecGoals($specification_id: Int!) {
      specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }, order_by: { priority: asc }) {
        enabled
        goal {
          analyses(order_by: { request: { specification_revision: desc } }, limit: 2) {
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
        specification_id
      }
    }
  `,

  SUB_SIMULATION: `#graphql
    subscription SubSimulation($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
        arguments
        id
        template: simulation_template {
          arguments
          description
          id
        }
      }
    }
  `,

  SUB_SIMULATION_DATASETS: `#graphql
    subscription SubSimulationDatasets($planId: Int!, $simulationDatasetId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc }, limit: 1) {
        simulation_datasets(where: { id: { _eq: $simulationDatasetId } }, limit: 1) {
          dataset {
            profiles {
              name
              profile_segments {
                dynamics
                start_offset
              }
              type
            }
          }
          id
          plan_revision
          reason
          status
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
    mutation UpdateActivityDirective($id: Int!, $activityDirectiveSetInput: activity_directive_set_input!) {
      updateActivityDirective: update_activity_directive_by_pk(
        pk_columns: { id: $id }, _set: $activityDirectiveSetInput
      ) {
        id
      }
    }
  `,

  UPDATE_CONSTRAINT: `#graphql
    mutation UpdateConstraint($id: Int!, $constraint: condition_set_input!) {
      updateConstraint: update_condition_by_pk(
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

  UPDATE_SCHEDULING_SPEC_GOAL: `#graphql
    mutation UpdateSchedulingSpecGoal(
      $goal_id: Int!,
      $specification_id: Int!,
      $spec_goal: scheduling_specification_goals_set_input!
    ) {
      updateSchedulingSpecGoal: update_scheduling_specification_goals_by_pk(
        pk_columns: { goal_id: $goal_id, specification_id:$specification_id },
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
        id
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

export default gql;
