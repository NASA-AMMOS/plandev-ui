/**
 * GraphQL Query, Mutation, and Subscription strings.
 */
const gql = {
  CREATE_ACTIVITY: `#graphql
    mutation CreateActivity($activity: activity_insert_input!) {
      createActivity: insert_activity_one(object: $activity) {
        id
      }
    }
  `,

  CREATE_COMMAND_DICTIONARY: `#graphql
    mutation CreateCommandDictionary($dictionary: String!) {
      createCommandDictionary: uploadDictionary(dictionary: $dictionary) {
        id
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
        goal_id
        priority
        specification_id
      }
    }
  `,

  CREATE_SEQUENCE: `#graphql
    mutation CreateSequence($sequence: sequence_insert_input!) {
      createSequence: insert_sequence_one(object: $sequence) {
        seq_id
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

  DELETE_ACTIVITY: `#graphql
    mutation DeleteActivity($id: Int!) {
      deleteActivity: delete_activity_by_pk(id: $id) {
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

  DELETE_SEQUENCE: `#graphql
    mutation DeleteSequence($seqId: String!, $datasetId: Int!) {
      deleteSequence: delete_sequence_by_pk(seq_id: $seqId, simulation_dataset_id: $datasetId) {
        seq_id
      }
    }
  `,

  EXPAND: `#graphql
    mutation Expand($expansionSetId: Int!, $datasetId: Int!) {
      expand: expandAllActivities(expansionSetId: $expansionSetId, simulationDatasetId: $datasetId) {
        id
      }
    }
  `,

  GET_ACTIVITIES_FOR_PLAN: `#graphql
    query GetActivitiesForPlan($planId: Int!) {
      activities: activity(where: { plan_id: { _eq: $planId } }) {
        arguments
        id
        start_offset
        type
      }
      plan: plan_by_pk(id: $planId) {
        start_time
      }
    }
  `,

  GET_ACTIVITY_TYPESCRIPT: `#graphql
    query GetActivityTypeScript($activityTypeName: String!, $modelId: Int!) {
      activity: getActivityTypeScript(activityTypeName: $activityTypeName, missionModelId:$modelId) {
        typescript
      }
    }
  `,

  GET_ACTIVITY_TYPES_EXPANSION_RULES: `#graphql
    query GetActivityTypesExpansionRules($modelId: Int!) {
      activityTypes: activity_type(where: { model_id: { _eq: $modelId } }) {
        expansion_rules {
          activity_type
          authoring_command_dict_id
          authoring_mission_model_id
          expansion_logic
          id
        }
        name
      }
    }
  `,

  GET_COMMAND_TYPESCRIPT: `#graphql
    query GetCommandTypeScript($commandDictionaryId: Int!) {
      command: getCommandTypeScript(commandDictionaryId: $commandDictionaryId) {
        typescript
      }
    }
  `,

  GET_CONSTRAINTS_TYPESCRIPT: `#graphql
    query GetConstraintsTypeScript($model_id: ID!) {
      constraintsTypeScript: constraintsDslTypescript(missionModelId: $model_id) {
        reason
        status
        typescriptFiles {
          content
          filePath
        }
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
        expansion_logic
        id
      }
    }
  `,

  GET_LATEST_SIMULATION_DATASET: `#graphql
    query GetLatestSimulationDataset($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { dataset: { id: desc } }, limit: 1) {
        dataset {
          id
        }
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
        activities {
          arguments
          id
          start_offset
          type
        }
        constraints: conditions {
          definition
          description
          id
          model_id
          name
          plan_id
          summary
        }
        duration
        id
        model: mission_model {
          activityTypes: activity_types {
            name
            parameters
          }
          constraints: conditions {
            definition
            description
            id
            model_id
            name
            plan_id
            summary
          }
          id
          parameters {
            parameters
          }
        }
        name
        revision
        scheduling_specifications {
          id
        }
        simulations {
          arguments
          datasets(order_by: { id: desc }, limit: 1) {
            id
          }
          id
          template: simulation_template {
            arguments
            description
            id
          }
        }
        start_time
      }
    }
  `,

  GET_PLANS_AND_MODELS: `#graphql
    query GetPlansAndModels {
      models: mission_model {
        id
        jar_id
        name
        version
      }
      plans: plan {
        duration
        id
        model_id
        name
        start_time
      }
    }
  `,

  GET_PLAN_REVISION: `#graphql
    query GetPlanRevision($id: Int!) {
      plan: plan_by_pk(id: $id) {
        revision
      }
    }
  `,

  GET_SCHEDULING_TYPESCRIPT: `#graphql
    query GetSchedulingTypeScript($model_id: Int!) {
      schedulingTypeScript: schedulingDslTypescript(missionModelId: $model_id) {
        reason
        status
        typescriptFiles {
          content
          filePath
        }
      }
    }
  `,

  RESOURCE_TYPES: `#graphql
    query ResourceTypes($modelId: ID!) {
      resourceTypes(missionModelId: $modelId) {
        name
        schema
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
        results
        status
      }
    }
  `,

  SUB_ACTIVITY_TYPE_NAMES: `#graphql
    subscription SubActivityTypes($modelId: Int!) {
      activityTypes: activity_type(where: { model_id: { _eq: $modelId } }) {
        name
      }
    }
  `,

  SUB_COMMAND_DICTIONARIES: `#graphql
    subscription SubCommandDictionaries {
      command_dictionary {
        command_types_typescript_path
        id
        mission
        version
      }
    }
  `,

  SUB_EXPANSION_RULES: `#graphql
    subscription SubExpansionRules {
      expansionRules: expansion_rule {
        activity_type
        authoring_command_dict_id
        authoring_mission_model_id
        expansion_logic
        id
      }
    }
  `,

  SUB_EXPANSION_SETS: `#graphql
    subscription SubExpansionSets {
      expansionSets: expansion_set {
        command_dict_id
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
      models: mission_model {
        id
        jar_id,
        name
        version
      }
    }
  `,

  SUB_SCHEDULING_SPEC_GOALS: `#graphql
    subscription SubSchedulingSpecGoals($specification_id: Int!) {
      specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }) {
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

  SUB_SEQUENCES: `#graphql
    subscription SubSequences {
      sequence {
        metadata
        seq_id
        simulation_dataset_id
      }
    }
  `,

  SUB_SIMULATION: `#graphql
    subscription SubSimulation($planId: Int!) {
      simulation(where: { plan_id: { _eq: $planId } }, order_by: { id: desc } limit: 1) {
        arguments
        datasets(order_by: { id: desc }, limit: 1) {
          id
        }
        id
        template: simulation_template {
          arguments
          description
          id
        }
      }
    }
  `,

  SUB_SIM_TEMPLATES: `#graphql
    subscription SubSimTemplates($modelId: Int!) {
      templates: simulation_template(where: { model_id: { _eq: $modelId } }) {
        arguments
        description
        id
      }
    }
  `,

  UPDATE_ACTIVITY: `#graphql
    mutation UpdateActivity($id: Int!, $activity: activity_set_input!) {
      updateActivity: update_activity_by_pk(
        pk_columns: { id: $id }, _set: $activity
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
        id
      }
    }
  `,

  UPDATE_SCHEDULING_GOAL: `#graphql
    mutation UpdateSchedulingGoal($id: Int!, $goal: scheduling_goal_set_input!) {
      updateSchedulingGoal: update_scheduling_goal_by_pk(
        pk_columns: { id: $id }, _set: $goal
      ) {
        id
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

  UPDATE_SIMULATION: `#graphql
    mutation UpdateSimulation($id: Int!, $simulation: simulation_set_input!) {
      updateSimulation: update_simulation_by_pk(
        pk_columns: { id: $id }, _set: $simulation
      ) {
        arguments
        datasets(order_by: { id: desc }, limit: 1) {
          id
        }
        id
        template: simulation_template {
          arguments
          description
          id
        }
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
        errors
        success
      }
    }
  `,
};

export default gql;
