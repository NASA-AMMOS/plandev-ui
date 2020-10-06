import { gql } from 'apollo-angular';

export const CREATE_ACTIVITY_INSTANCES = gql(`
  mutation CreateActivityInstances(
    $activityInstances: [CreateActivityInstance]!
    $planId: ID!
  ) {
    createActivityInstances(
      activityInstances: $activityInstances
      planId: $planId
    ) {
      ids
      message
      success
    }
  }
`);

export const CREATE_ADAPTATION = gql(`
  mutation CreateAdaptation(
    $file: Upload!
    $mission: String!
    $name: String!
    $owner: String!
    $version: String!
  ) {
    createAdaptation(
      file: $file
      mission: $mission
      name: $name
      owner: $owner
      version: $version
    ) {
      id
      message
      success
    }
  }
`);

export const CREATE_PLAN = gql(`
  mutation CreatePlan(
    $adaptationId: String!
    $endTimestamp: String!
    $name: String!
    $startTimestamp: String!
  ) {
    createPlan(
      adaptationId: $adaptationId
      endTimestamp: $endTimestamp
      name: $name
      startTimestamp: $startTimestamp
    ) {
      id
      message
      success
    }
  }
`);

export const GET_ADAPTATIONS = gql(`
  query GetAdaptations {
    adaptations {
      id
      mission
      name
      owner
      version
    }
  }
`);

export const GET_PLAN_DETAIL = gql(`
  query GetPlanDetail($id: ID!) {
    plan(id: $id) {
      activityInstances {
        children
        duration
        id
        parameters {
          name
          value
        }
        parent
        startTimestamp
        type
      }
      adaptation {
        activityTypes {
          name
          parameters {
            default
            name
            schema
          }
        }
      }
      adaptationId
      endTimestamp
      id
      name
      startTimestamp
    }
  }
`);

export const GET_PLANS_AND_ADAPTATIONS = gql(`
  query GetPlansAndAdaptations {
    adaptations {
      id
      mission
      name
      owner
      version
    }
    plans {
      adaptationId
      endTimestamp
      id
      name
      startTimestamp
    }
  }
`);

export const GET_UI_STATES = gql(`
  query GetUiStates {
    uiStates {
      id
      name
      panels
    }
  }
`);

export const DELETE_ACTIVITY_INSTANCE = gql(`
  mutation DeleteActivityInstance(
    $activityInstanceId: ID!
    $planId: ID!
  ) {
    deleteActivityInstance(
      activityInstanceId: $activityInstanceId
      planId: $planId
    ) {
      message
      success
    }
  }
`);

export const DELETE_ADAPTATION = gql(`
  mutation DeleteAdaptation($id: ID!) {
    deleteAdaptation(id: $id) {
      message
      success
    }
  }
`);

export const DELETE_PLAN = gql(`
  mutation DeletePlan($id: ID!) {
    deletePlan(id: $id) {
      message
      success
    }
  }
`);

export const SIMULATE = gql(`
  query Simulate($adaptationId: String!, $planId: String!, $samplingPeriod: Float!) {
    simulate(adaptationId: $adaptationId, planId: $planId, samplingPeriod: $samplingPeriod) {
      activities {
        children
        duration
        id
        parameters {
          name
          value
        }
        parent
        startTimestamp
        type
      }
      message
      results {
        name
        schema
        start
        values {
          x
          y
        }
      }
      success
      violations {
        associations {
          activityInstanceIds
          stateIds
        }
        constraint {
          category
          message
          name
        }
        windows {
          end
          start
        }
      }
    }
  }
`);

export const UPDATE_ACTIVITY_INSTANCE = gql(`
  mutation UpdateActivityInstance(
    $activityInstance: UpdateActivityInstance!
    $planId: ID!
  ) {
    updateActivityInstance(
      activityInstance: $activityInstance
      planId: $planId
    ) {
      message
      success
    }
  }
`);

export const VALIDATE_PARAMETERS = gql(`
  query ValidateParameters(
    $activityTypeName: String!
    $adaptationId: ID!
    $parameters: [ActivityInstanceParameterInput!]!
  ) {
    validateParameters(
      activityTypeName: $activityTypeName
      adaptationId: $adaptationId
      parameters: $parameters
    ) {
      errors
      success
    }
  }
`);
