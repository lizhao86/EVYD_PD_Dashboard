import { ModelInit, MutableModel, __modelMeta__, ManagedIdentifier } from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled } from "@aws-amplify/datastore";





type EagerUserSettings = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserSettings, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly role: string;
  readonly language?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserSettings = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserSettings, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly role: string;
  readonly language?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserSettings = LazyLoading extends LazyLoadingDisabled ? EagerUserSettings : LazyUserSettings

export declare const UserSettings: (new (init: ModelInit<UserSettings>) => UserSettings) & {
  copyOf(source: UserSettings, mutator: (draft: MutableModel<UserSettings>) => MutableModel<UserSettings> | void): UserSettings;
}

type EagerApplication = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Application, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyApplication = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Application, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Application = LazyLoading extends LazyLoadingDisabled ? EagerApplication : LazyApplication

export declare const Application: (new (init: ModelInit<Application>) => Application) & {
  copyOf(source: Application, mutator: (draft: MutableModel<Application>) => MutableModel<Application> | void): Application;
}

type EagerUserApplicationApiKey = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserApplicationApiKey, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly applicationID: string;
  readonly apiKey: string;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyUserApplicationApiKey = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<UserApplicationApiKey, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly applicationID: string;
  readonly apiKey: string;
  readonly owner?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type UserApplicationApiKey = LazyLoading extends LazyLoadingDisabled ? EagerUserApplicationApiKey : LazyUserApplicationApiKey

export declare const UserApplicationApiKey: (new (init: ModelInit<UserApplicationApiKey>) => UserApplicationApiKey) & {
  copyOf(source: UserApplicationApiKey, mutator: (draft: MutableModel<UserApplicationApiKey>) => MutableModel<UserApplicationApiKey> | void): UserApplicationApiKey;
}

type EagerConversation = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Conversation, 'id'>;
  };
  readonly id: string;
  readonly title?: string | null;
  readonly messages?: string | null;
  readonly appType?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyConversation = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Conversation, 'id'>;
  };
  readonly id: string;
  readonly title?: string | null;
  readonly messages?: string | null;
  readonly appType?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type Conversation = LazyLoading extends LazyLoadingDisabled ? EagerConversation : LazyConversation

export declare const Conversation: (new (init: ModelInit<Conversation>) => Conversation) & {
  copyOf(source: Conversation, mutator: (draft: MutableModel<Conversation>) => MutableModel<Conversation> | void): Conversation;
}

type EagerGlobalConfig = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<GlobalConfig, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly configKey: string;
  readonly configValue: string;
  readonly applicationType: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

type LazyGlobalConfig = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<GlobalConfig, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly configKey: string;
  readonly configValue: string;
  readonly applicationType: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export declare type GlobalConfig = LazyLoading extends LazyLoadingDisabled ? EagerGlobalConfig : LazyGlobalConfig

export declare const GlobalConfig: (new (init: ModelInit<GlobalConfig>) => GlobalConfig) & {
  copyOf(source: GlobalConfig, mutator: (draft: MutableModel<GlobalConfig>) => MutableModel<GlobalConfig> | void): GlobalConfig;
}