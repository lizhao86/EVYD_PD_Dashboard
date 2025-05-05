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
export const onUpdateUserSettings = /* GraphQL */ `
  subscription OnUpdateUserSettings(
    $filter: ModelSubscriptionUserSettingsFilterInput
    $owner: String
  ) {
    onUpdateUserSettings(filter: $filter, owner: $owner) {
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
export const onDeleteUserSettings = /* GraphQL */ `
  subscription OnDeleteUserSettings(
    $filter: ModelSubscriptionUserSettingsFilterInput
    $owner: String
  ) {
    onDeleteUserSettings(filter: $filter, owner: $owner) {
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
export const onCreateApplication = /* GraphQL */ `
  subscription OnCreateApplication(
    $filter: ModelSubscriptionApplicationFilterInput
  ) {
    onCreateApplication(filter: $filter) {
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
export const onUpdateApplication = /* GraphQL */ `
  subscription OnUpdateApplication(
    $filter: ModelSubscriptionApplicationFilterInput
  ) {
    onUpdateApplication(filter: $filter) {
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
export const onDeleteApplication = /* GraphQL */ `
  subscription OnDeleteApplication(
    $filter: ModelSubscriptionApplicationFilterInput
  ) {
    onDeleteApplication(filter: $filter) {
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
export const onCreateUserApplicationApiKey = /* GraphQL */ `
  subscription OnCreateUserApplicationApiKey(
    $filter: ModelSubscriptionUserApplicationApiKeyFilterInput
    $owner: String
  ) {
    onCreateUserApplicationApiKey(filter: $filter, owner: $owner) {
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
export const onUpdateUserApplicationApiKey = /* GraphQL */ `
  subscription OnUpdateUserApplicationApiKey(
    $filter: ModelSubscriptionUserApplicationApiKeyFilterInput
    $owner: String
  ) {
    onUpdateUserApplicationApiKey(filter: $filter, owner: $owner) {
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
export const onDeleteUserApplicationApiKey = /* GraphQL */ `
  subscription OnDeleteUserApplicationApiKey(
    $filter: ModelSubscriptionUserApplicationApiKeyFilterInput
    $owner: String
  ) {
    onDeleteUserApplicationApiKey(filter: $filter, owner: $owner) {
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
export const onCreateConversation = /* GraphQL */ `
  subscription OnCreateConversation(
    $filter: ModelSubscriptionConversationFilterInput
    $owner: String
  ) {
    onCreateConversation(filter: $filter, owner: $owner) {
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
export const onUpdateConversation = /* GraphQL */ `
  subscription OnUpdateConversation(
    $filter: ModelSubscriptionConversationFilterInput
    $owner: String
  ) {
    onUpdateConversation(filter: $filter, owner: $owner) {
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
export const onDeleteConversation = /* GraphQL */ `
  subscription OnDeleteConversation(
    $filter: ModelSubscriptionConversationFilterInput
    $owner: String
  ) {
    onDeleteConversation(filter: $filter, owner: $owner) {
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
export const onCreateGlobalConfig = /* GraphQL */ `
  subscription OnCreateGlobalConfig(
    $filter: ModelSubscriptionGlobalConfigFilterInput
  ) {
    onCreateGlobalConfig(filter: $filter) {
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
export const onUpdateGlobalConfig = /* GraphQL */ `
  subscription OnUpdateGlobalConfig(
    $filter: ModelSubscriptionGlobalConfigFilterInput
  ) {
    onUpdateGlobalConfig(filter: $filter) {
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
export const onDeleteGlobalConfig = /* GraphQL */ `
  subscription OnDeleteGlobalConfig(
    $filter: ModelSubscriptionGlobalConfigFilterInput
  ) {
    onDeleteGlobalConfig(filter: $filter) {
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
