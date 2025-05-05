/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUserSettings = /* GraphQL */ `
  query GetUserSettings($id: ID!) {
    getUserSettings(id: $id) {
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
        language
        createdAt
        updatedAt
        _version
        _deleted
        _lastChangedAt
        owner
        __typename
      }
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncUserSettings = /* GraphQL */ `
  query SyncUserSettings(
    $filter: ModelUserSettingsFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncUserSettings(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getApplication = /* GraphQL */ `
  query GetApplication($id: ID!) {
    getApplication(id: $id) {
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
export const listApplications = /* GraphQL */ `
  query ListApplications(
    $filter: ModelApplicationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listApplications(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncApplications = /* GraphQL */ `
  query SyncApplications(
    $filter: ModelApplicationFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncApplications(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getUserApplicationApiKey = /* GraphQL */ `
  query GetUserApplicationApiKey($id: ID!) {
    getUserApplicationApiKey(id: $id) {
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
export const listUserApplicationApiKeys = /* GraphQL */ `
  query ListUserApplicationApiKeys(
    $filter: ModelUserApplicationApiKeyFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserApplicationApiKeys(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncUserApplicationApiKeys = /* GraphQL */ `
  query SyncUserApplicationApiKeys(
    $filter: ModelUserApplicationApiKeyFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncUserApplicationApiKeys(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getConversation = /* GraphQL */ `
  query GetConversation($id: ID!) {
    getConversation(id: $id) {
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
export const listConversations = /* GraphQL */ `
  query ListConversations(
    $filter: ModelConversationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listConversations(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncConversations = /* GraphQL */ `
  query SyncConversations(
    $filter: ModelConversationFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncConversations(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const getGlobalConfig = /* GraphQL */ `
  query GetGlobalConfig($id: ID!) {
    getGlobalConfig(id: $id) {
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
export const listGlobalConfigs = /* GraphQL */ `
  query ListGlobalConfigs(
    $filter: ModelGlobalConfigFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listGlobalConfigs(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const syncGlobalConfigs = /* GraphQL */ `
  query SyncGlobalConfigs(
    $filter: ModelGlobalConfigFilterInput
    $limit: Int
    $nextToken: String
    $lastSync: AWSTimestamp
  ) {
    syncGlobalConfigs(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      lastSync: $lastSync
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const userApplicationApiKeysByApplicationIDAndOwner = /* GraphQL */ `
  query UserApplicationApiKeysByApplicationIDAndOwner(
    $applicationID: ID!
    $owner: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelUserApplicationApiKeyFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userApplicationApiKeysByApplicationIDAndOwner(
      applicationID: $applicationID
      owner: $owner
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
export const conversationsByAppType = /* GraphQL */ `
  query ConversationsByAppType(
    $updatedAt: AWSDateTime!
    $createdAt: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelConversationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    conversationsByAppType(
      updatedAt: $updatedAt
      createdAt: $createdAt
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
      nextToken
      startedAt
      __typename
    }
  }
`;
