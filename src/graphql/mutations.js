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
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      owner
      __typename
    }
  }
`;
export const createApplication = /* GraphQL */ `
  mutation CreateApplication(
    $input: CreateApplicationInput!
    $condition: ModelApplicationConditionInput
  ) {
    createApplication(input: $input, condition: $condition) {
      id
      name
      description
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const updateApplication = /* GraphQL */ `
  mutation UpdateApplication(
    $input: UpdateApplicationInput!
    $condition: ModelApplicationConditionInput
  ) {
    updateApplication(input: $input, condition: $condition) {
      id
      name
      description
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const deleteApplication = /* GraphQL */ `
  mutation DeleteApplication(
    $input: DeleteApplicationInput!
    $condition: ModelApplicationConditionInput
  ) {
    deleteApplication(input: $input, condition: $condition) {
      id
      name
      description
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const createUserApplicationApiKey = /* GraphQL */ `
  mutation CreateUserApplicationApiKey(
    $input: CreateUserApplicationApiKeyInput!
    $condition: ModelUserApplicationApiKeyConditionInput
  ) {
    createUserApplicationApiKey(input: $input, condition: $condition) {
      id
      applicationID
      apiKey
      owner
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const updateUserApplicationApiKey = /* GraphQL */ `
  mutation UpdateUserApplicationApiKey(
    $input: UpdateUserApplicationApiKeyInput!
    $condition: ModelUserApplicationApiKeyConditionInput
  ) {
    updateUserApplicationApiKey(input: $input, condition: $condition) {
      id
      applicationID
      apiKey
      owner
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const deleteUserApplicationApiKey = /* GraphQL */ `
  mutation DeleteUserApplicationApiKey(
    $input: DeleteUserApplicationApiKeyInput!
    $condition: ModelUserApplicationApiKeyConditionInput
  ) {
    deleteUserApplicationApiKey(input: $input, condition: $condition) {
      id
      applicationID
      apiKey
      owner
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
export const createConversation = /* GraphQL */ `
  mutation CreateConversation(
    $input: CreateConversationInput!
    $condition: ModelConversationConditionInput
  ) {
    createConversation(input: $input, condition: $condition) {
      id
      title
      messages
      appType
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      owner
      __typename
    }
  }
`;
export const updateConversation = /* GraphQL */ `
  mutation UpdateConversation(
    $input: UpdateConversationInput!
    $condition: ModelConversationConditionInput
  ) {
    updateConversation(input: $input, condition: $condition) {
      id
      title
      messages
      appType
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      owner
      __typename
    }
  }
`;
export const deleteConversation = /* GraphQL */ `
  mutation DeleteConversation(
    $input: DeleteConversationInput!
    $condition: ModelConversationConditionInput
  ) {
    deleteConversation(input: $input, condition: $condition) {
      id
      title
      messages
      appType
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
      configKey
      configValue
      applicationType
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
      configKey
      configValue
      applicationType
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
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
      configKey
      configValue
      applicationType
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
      __typename
    }
  }
`;
