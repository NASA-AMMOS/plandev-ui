export const CREATE_ACTIVITY = `#graphql
  mutation CreateActivity($activity: activity_insert_input!) {
    createActivity: insert_activity_one(object: $activity) {
      id
    }
  }
`;

export const CREATE_CONSTRAINT = `#graphql
  mutation CreateConstraint($constraint: condition_insert_input!) {
    createConstraint: insert_condition_one(object: $constraint) {
      id
    }
  }
`;

export const CREATE_MODEL = `#graphql
  mutation CreateModel($model: mission_model_insert_input!) {
    createModel: insert_mission_model_one(object: $model) {
      id
    }
  }
`;

export const CREATE_PLAN = `#graphql
  mutation CreatePlan($plan: plan_insert_input!) {
    createPlan: insert_plan_one(object: $plan) {
      id
      revision
    }
  }
`;

export const CREATE_SCHEDULING_GOAL = `#graphql
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
`;

export const CREATE_SCHEDULING_SPEC = `#graphql
  mutation CreateSchedulingSpec($spec: scheduling_specification_insert_input!) {
    createSchedulingSpec: insert_scheduling_specification_one(object: $spec) {
      id
    }
  }
`;

export const CREATE_SCHEDULING_SPEC_GOAL = `#graphql
  mutation CreateSchedulingSpecGoal($spec_goal: scheduling_specification_goals_insert_input!) {
    createSchedulingSpecGoal: insert_scheduling_specification_goals_one(object: $spec_goal) {
      goal_id
      priority
      specification_id
    }
  }
`;

export const CREATE_SIMULATION = `#graphql
  mutation CreateSimulation($simulation: simulation_insert_input!) {
    createSimulation: insert_simulation_one(object: $simulation) {
      id
    }
  }
`;

export const DELETE_ACTIVITY = `#graphql
  mutation DeleteActivity($id: Int!) {
    deleteActivity: delete_activity_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_MODEL = `#graphql
  mutation DeleteModel($id: Int!) {
    deleteModel: delete_mission_model_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_CONSTRAINT = `#graphql
  mutation DeleteConstraint($id: Int!) {
    deleteConstraint: delete_condition_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_PLAN = `#graphql
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
`;

export const GET_ACTIVITIES_FOR_PLAN = `#graphql
  query GetActivitiesForPlan($planId: Int!) {
    activities: activity(where: { plan_id: { _eq: $planId } }) {
      arguments
      id
      startOffset: start_offset
      type
    }
    plan: plan_by_pk(id: $planId) {
      startTime: start_time
    }
  }
`;

export const GET_EFFECTIVE_ACTIVITY_ARGUMENTS = `#graphql
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
`;

export const GET_EFFECTIVE_MODEL_ARGUMENTS = `#graphql
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
`;

export const GET_MODELS = `#graphql
  query GetModels {
    models: mission_model {
      id
      jarId: jar_id,
      name
      version
    }
  }
`;

export const GET_PLAN = `#graphql
  query GetPlan($id: Int!) {
    plan: plan_by_pk(id: $id) {
      activities {
        arguments
        id
        startOffset: start_offset
        type
      }
      constraints: conditions {
        definition
        description
        id
        modelId: model_id
        name
        planId: plan_id
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
          modelId: model_id
          name
          planId: plan_id
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
        id
        template: simulation_template {
          arguments
          description
          id
        }
      }
      startTime: start_time
    }
  }
`;

export const GET_PLANS_AND_MODELS = `#graphql
  query GetPlansAndModels {
    models: mission_model {
      id
      name
    }
    plans: plan {
      duration
      id
      modelId: model_id
      name
      startTime: start_time
    }
  }
`;

export const GET_SCHEDULING_SPEC_GOAL_PRIORITIES = `#graphql
  query GetSchedulingSpecGoalPriorities($specification_id: Int!) {
    specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }) {
      priority
    }
  }
`;

export const RESOURCE_TYPES = `#graphql
  query ResourceTypes($modelId: ID!) {
    resourceTypes(missionModelId: $modelId) {
      name
      schema
    }
  }
`;

export const SIMULATE = `#graphql
  query Simulate($planId: Int!) {
    simulate(planId: $planId) {
      status
      results
    }
  }
`;

export const SUB_SCHEDULING_SPEC_GOALS = `#graphql
  subscription SubSchedulingSpecGoals($specification_id: Int!) {
    specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }) {
    	goal {
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
    }
  }
`;

export const SUB_SIM_TEMPLATES = `#graphql
  subscription SubSimTemplates($modelId: Int!) {
    templates: simulation_template(where: { model_id: { _eq: $modelId } }) {
      arguments
      description
      id
    }
  }
`;

export const UPDATE_ACTIVITY = `#graphql
  mutation UpdateActivity($id: Int!, $activity: activity_set_input!) {
    updateActivity: update_activity_by_pk(
      pk_columns: {id: $id}, _set: $activity
    ) {
      id
    }
  }
`;

export const UPDATE_CONSTRAINT = `#graphql
  mutation UpdateConstraint($id: Int!, $constraint: condition_set_input!) {
    updateConstraint: update_condition_by_pk(
      pk_columns: {id: $id}, _set: $constraint
    ) {
      id
    }
  }
`;

export const UPDATE_SIMULATION = `#graphql
  mutation UpdateSimulation($id: Int!, $simulation: simulation_set_input!) {
    updateSimulation: update_simulation_by_pk(
      pk_columns: {id: $id}, _set: $simulation
    ) {
      arguments
      id
      template: simulation_template {
        arguments
        description
        id
      }
    }
  }
`;

export const VALIDATE_ACTIVITY_ARGUMENTS = `#graphql
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
`;
