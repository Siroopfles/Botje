import { handler as serverSettingsHandler } from './serverSettingsHandler.js';

export const handlers = {
  server: serverSettingsHandler
};

export type { NotificationSettings, ServerSettings } from '../../../types.js';