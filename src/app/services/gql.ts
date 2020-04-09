import gql from 'graphql-tag';

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
