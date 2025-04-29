// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { UserSettings, Application, UserApplicationApiKey, Conversation, GlobalConfig } = initSchema(schema);

export {
  UserSettings,
  Application,
  UserApplicationApiKey,
  Conversation,
  GlobalConfig
};