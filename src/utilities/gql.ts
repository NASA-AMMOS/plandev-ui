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

  CREATE_CONSTRAINT: `#graphql
    mutation CreateConstraint($constraint: condition_insert_input!) {
      createConstraint: insert_condition_one(object: $constraint) {
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

  DELETE_CONSTRAINT: `#graphql
    mutation DeleteConstraint($id: Int!) {
      deleteConstraint: delete_condition_by_pk(id: $id) {
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

  GET_ACTIVITIES_FOR_PLAN: `#graphql
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

  GET_MODELS: `#graphql
    query GetModels {
      models: mission_model {
        id
        jarId: jar_id,
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
          startOffset: start_offset
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
  `,

  GET_PLANS_AND_MODELS: `#graphql
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
  `,

  GET_PLAN_REVISION: `#graphql
    query GetPlanRevision($id: Int!) {
      plan: plan_by_pk(id: $id) {
        revision
      }
    }
  `,

  GET_SCHEDULING_SPEC_GOAL_PRIORITIES: `#graphql
    query GetSchedulingSpecGoalPriorities($specification_id: Int!) {
      specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }) {
        priority
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

  SUB_SCHEDULING_SPEC_GOALS: `#graphql
    subscription SubSchedulingSpecGoals($specification_id: Int!) {
      specGoals: scheduling_specification_goals(where: { specification_id: { _eq: $specification_id } }) {
        goal {
          analyses(order_by: { request: { specification_revision: desc } }, limit: 2) {
            satisfied
            satisfying_activities {
              activity_id
            }
            satisfying_activities_aggregate {
              aggregate {
                count
              }
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
