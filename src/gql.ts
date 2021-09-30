export const CREATE_ACTIVITIES = `
  mutation CreateActivities(
    $activities: [CreateActivityInstance]!
    $planId: ID!
  ) {
    createActivities: createActivityInstances(
      activityInstances: $activities
      planId: $planId
    ) {
      ids
      message
      success
    }
  }
`;

export const CREATE_MODEL = `
  mutation CreateModel(
    $file: Upload!
    $mission: String!
    $name: String!
    $owner: String!
    $version: String!
  ) {
    createModel: createAdaptation(
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
`;

export const CREATE_PLAN = `
  mutation CreatePlan(
    $modelId: String!
    $modelArguments: ConfigurationValue
    $endTimestamp: String!
    $name: String!
    $startTimestamp: String!
  ) {
    createPlan(
      adaptationId: $modelId
      configuration: $modelArguments
      endTimestamp: $endTimestamp
      name: $name
      startTimestamp: $startTimestamp
    ) {
      id
      message
      success
    }
  }
`;

export const DELETE_ACTIVITY = `
  mutation DeleteActivity(
    $activityId: ID!
    $planId: ID!
  ) {
    deleteActivity: deleteActivityInstance(
      activityInstanceId: $activityId
      planId: $planId
    ) {
      message
      success
    }
  }
`;

export const DELETE_MODEL = `
  mutation DeleteModel($id: ID!) {
    deleteModel: deleteAdaptation(id: $id) {
      message
      success
    }
  }
`;

export const DELETE_MODEL_CONSTRAINTS = `
  mutation DeleteModelConstraints(
    $id: ID!
    $names: [String!]!
  ) {
    deleteConstraints: deleteAdaptationConstraints(
      id: $id
      names: $names
    ) {
      message
      success
    }
  }
`;

export const DELETE_PLAN = `
  mutation DeletePlan($id: ID!) {
    deletePlan(id: $id) {
      message
      success
    }
  }
`;

export const DELETE_PLAN_CONSTRAINTS = `
  mutation DeletePlanConstraints(
    $id: ID!
    $names: [String!]!
  ) {
    deleteConstraints: deletePlanConstraints(
      id: $id
      names: $names
    ) {
      message
      success
    }
  }
`;

export const GET_MODELS = `
  query GetModels {
    models: adaptations {
      id
      name
      version
    }
  }
`;

export const GET_PLAN = `
  query GetPlan($id: ID!) {
    plan(id: $id) {
      activities: activityInstances {
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
      constraints {
        definition
        description
        name
        summary
      }
      endTimestamp
      id
      model: adaptation {
        activityTypes {
          name
          parameters {
            default
            name
            schema
          }
        }
        constraints {
          definition
          description
          name
          summary
        }
        modelParameters {
          parameters {
            name
            schema
          }
        }
      }
      modelArguments: configuration {
        parameters {
          name
          value
        }
      }
      modelId: adaptationId
      name
      startTimestamp
    }
  }
`;

export const GET_PLANS_AND_MODELS = `
  query GetPlansAndModels {
    models: adaptations {
      id
      name
    }
    plans {
      modelId: adaptationId
      endTimestamp
      id
      name
      startTimestamp
    }
  }
`;

export const SIMULATE = `
  query Simulate($modelId: String!, $planId: String!) {
    simulate(adaptationId: $modelId, planId: $planId, nonblocking: true) {
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
      status
      success
      violations {
        associations {
          activityIds: activityInstanceIds
          resourceIds
        }
        constraint {
          name
        }
        windows {
          end
          start
        }
      }
    }
  }
`;

export const UPDATE_ACTIVITY = `
  mutation UpdateActivity(
    $activity: UpdateActivityInstance!
    $planId: ID!
  ) {
    updateActivity: updateActivityInstance(
      activityInstance: $activity
      planId: $planId
    ) {
      message
      success
    }
  }
`;

export const UPDATE_MODEL_ARGUMENTS = `
  mutation UpdateModelArguments(
    $planId: ID!
    $modelArguments: ConfigurationValue
  ) {
    updateModelArguments: updatePlanConfiguration(
      planId: $planId
      configuration: $modelArguments
    ) {
      message
      success
    }
  }
`;

export const UPDATE_MODEL_CONSTRAINTS = `
  mutation UpdateModelConstraints(
    $id: ID!
    $constraints: [ConstraintDefinitionInput!]!
  ) {
    updateConstraints: updateAdaptationConstraints(
      adaptationId: $id
      constraints: $constraints
    ) {
      message
      success
    }
  }
`;

export const UPDATE_PLAN_CONSTRAINTS = `
  mutation UpdatePlanConstraints(
    $id: ID!
    $constraints: [ConstraintDefinitionInput!]!
  ) {
    updateConstraints: updatePlanConstraints(
      planId: $id
      constraints: $constraints
    ) {
      message
      success
    }
  }
`;

export const UPLOAD_FILE = `
  mutation UploadFile(
    $file: Upload!
  ) {
    uploadFile(
      file: $file
    ) {
      message
      success
    }
  }
`;

export const VALIDATE_PARAMETERS = `
  query ValidateParameters(
    $activityTypeName: String!
    $modelId: ID!
    $parameters: [ActivityInstanceParameterInput!]!
  ) {
    validateParameters(
      activityTypeName: $activityTypeName
      adaptationId: $modelId
      parameters: $parameters
    ) {
      errors
      success
    }
  }
`;
