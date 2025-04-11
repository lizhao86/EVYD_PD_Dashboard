/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUserSettings = /* GraphQL */ `
  query GetUserSettings($id: ID!) {
    getUserSettings(id: $id) {
      id
      role
      apiKeys {
        userStory
        userManual
        requirementsAnalysis
        __typename
      }
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const listUserSettings = /* GraphQL */ `
  query ListUserSettings(
    $filter: ModelUserSettingsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserSettings(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        role
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getGlobalConfig = /* GraphQL */ `
  query GetGlobalConfig($id: ID!) {
    getGlobalConfig(id: $id) {
      id
      apiEndpoints {
        userStory
        userManual
        requirementsAnalysis
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listGlobalConfigs = /* GraphQL */ `
  query ListGlobalConfigs(
    $filter: ModelGlobalConfigFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listGlobalConfigs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
