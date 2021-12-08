export const CREATE_ACTIVITY = `
  mutation CreateActivity($activity: activity_insert_input!) {
    createActivity: insert_activity_one(object: $activity) {
      id
    }
  }
`;

export const CREATE_CONSTRAINT = `
  mutation CreateConstraint($constraint: condition_insert_input!) {
    createConstraint: insert_condition_one(object: $constraint) {
      id
    }
  }
`;

export const CREATE_MODEL = `
  mutation CreateModel($model: mission_model_insert_input!) {
    createModel: insert_mission_model_one(object: $model) {
      id
    }
  }
`;

export const CREATE_PLAN = `
  mutation CreatePlan($plan: plan_insert_input!) {
    createPlan: insert_plan_one(object: $plan) {
      id
    }
  }
`;

export const CREATE_SIMULATION = `
  mutation CreateSimulation($simulation: simulation_insert_input!) {
    createSimulation: insert_simulation_one(object: $simulation) {
      id
    }
  }
`;

export const DELETE_ACTIVITY = `
  mutation DeleteActivity($id: Int!) {
    deleteActivity: delete_activity_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_MODEL = `
  mutation DeleteModel($id: Int!) {
    deleteModel: delete_mission_model_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_CONSTRAINT = `
  mutation DeleteConstraint($id: Int!) {
    deleteConstraint: delete_condition_by_pk(id: $id) {
      id
    }
  }
`;

export const DELETE_PLAN_AND_SIMULATIONS = `
  mutation DeletePlan($id: Int!) {
    deletePlan: delete_plan_by_pk(id: $id) {
      id
    }
    deleteSimulation: delete_simulation(where: {plan_id: {_eq: $id}}) {
      returning {
        id
      }
    }
  }
`;

export const GET_ACTIVITIES_FOR_PLAN = `
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

export const GET_MODELS = `
  query GetModels {
    models: mission_model {
      id
      jarId: jar_id,
      name
      version
    }
  }
`;

export const GET_PLAN = `
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
      simulations {
        arguments
        id
      }
      startTime: start_time
    }
  }
`;

export const GET_PLANS_AND_MODELS = `
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

export const RESOURCE_TYPES = `
  query ResourceTypes($modelId: ID!) {
    resourceTypes(missionModelId: $modelId) {
      name
      schema
    }
  }
`;

export const SIMULATE = `
  query Simulate($planId: Int!) {
    simulate(planId: $planId) {
      status
      results
    }
  }
`;

export const UPDATE_ACTIVITY = `
  mutation UpdateActivity($id: Int!, $activity: activity_set_input!) {
    updateActivity: update_activity_by_pk(
      pk_columns: {id: $id}, _set: $activity
    ) {
      id
    }
  }
`;

export const UPDATE_CONSTRAINT = `
  mutation UpdateConstraint($id: Int!, $constraint: condition_set_input!) {
    updateConstraint: update_condition_by_pk(
      pk_columns: {id: $id}, _set: $constraint
    ) {
      id
    }
  }
`;

export const UPDATE_SIMULATION_ARGUMENTS = `
  mutation UpdateSimulationArguments($simulationId: Int!, $arguments: jsonb!) {
    updateSimulationArguments: update_simulation_by_pk(
      pk_columns: {id: $simulationId}, _set: { arguments: $arguments }
    ) {
      id
    }
  }
`;

export const VALIDATE_ACTIVITY_ARGUMENTS = `
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
