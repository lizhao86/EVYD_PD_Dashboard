/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateUserSettings = /* GraphQL */ `
  subscription OnCreateUserSettings(
    $filter: ModelSubscriptionUserSettingsFilterInput
    $owner: String
  ) {
    onCreateUserSettings(filter: $filter, owner: $owner) {
      id
      role
      language
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
export const onUpdateUserSettings = /* GraphQL */ `
  subscription OnUpdateUserSettings(
    $filter: ModelSubscriptionUserSettingsFilterInput
    $owner: String
  ) {
    onUpdateUserSettings(filter: $filter, owner: $owner) {
      id
      role
      language
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
export const onDeleteUserSettings = /* GraphQL */ `
  subscription OnDeleteUserSettings(
    $filter: ModelSubscriptionUserSettingsFilterInput
    $owner: String
  ) {
    onDeleteUserSettings(filter: $filter, owner: $owner) {
      id
      role
      language
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
export const onCreateGlobalConfig = /* GraphQL */ `
  subscription OnCreateGlobalConfig(
    $filter: ModelSubscriptionGlobalConfigFilterInput
  ) {
    onCreateGlobalConfig(filter: $filter) {
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
export const onUpdateGlobalConfig = /* GraphQL */ `
  subscription OnUpdateGlobalConfig(
    $filter: ModelSubscriptionGlobalConfigFilterInput
  ) {
    onUpdateGlobalConfig(filter: $filter) {
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
export const onDeleteGlobalConfig = /* GraphQL */ `
  subscription OnDeleteGlobalConfig(
    $filter: ModelSubscriptionGlobalConfigFilterInput
  ) {
    onDeleteGlobalConfig(filter: $filter) {
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
