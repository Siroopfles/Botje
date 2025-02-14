import { NotificationsHandler } from './notificationsHandler.js';
import { SettingsHandlers } from '../types.js';

const handlers: SettingsHandlers = {
    notifications: new NotificationsHandler()
    // Add more settings handlers here as needed
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };