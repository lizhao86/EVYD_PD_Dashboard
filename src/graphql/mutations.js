/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createUserSettings = /* GraphQL */ `
  mutation CreateUserSettings(
    $input: CreateUserSettingsInput!
    $condition: ModelUserSettingsConditionInput
  ) {
    createUserSettings(input: $input, condition: $condition) {
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
export const updateUserSettings = /* GraphQL */ `
  mutation UpdateUserSettings(
    $input: UpdateUserSettingsInput!
    $condition: ModelUserSettingsConditionInput
  ) {
    updateUserSettings(input: $input, condition: $condition) {
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
export const deleteUserSettings = /* GraphQL */ `
  mutation DeleteUserSettings(
    $input: DeleteUserSettingsInput!
    $condition: ModelUserSettingsConditionInput
  ) {
    deleteUserSettings(input: $input, condition: $condition) {
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
export const createGlobalConfig = /* GraphQL */ `
  mutation CreateGlobalConfig(
    $input: CreateGlobalConfigInput!
    $condition: ModelGlobalConfigConditionInput
  ) {
    createGlobalConfig(input: $input, condition: $condition) {
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
export const updateGlobalConfig = /* GraphQL */ `
  mutation UpdateGlobalConfig(
    $input: UpdateGlobalConfigInput!
    $condition: ModelGlobalConfigConditionInput
  ) {
    updateGlobalConfig(input: $input, condition: $condition) {
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
export const deleteGlobalConfig = /* GraphQL */ `
  mutation DeleteGlobalConfig(
    $input: DeleteGlobalConfigInput!
    $condition: ModelGlobalConfigConditionInput
  ) {
    deleteGlobalConfig(input: $input, condition: $condition) {
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
