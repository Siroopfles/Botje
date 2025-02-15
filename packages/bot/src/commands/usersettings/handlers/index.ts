import { NotificationsHandler } from './notificationsHandler.js';
import { ViewHandler } from './viewHandler.js';
import { UserSettingsHandlers } from '../types.js';

const handlers: UserSettingsHandlers = {
    notifications: new NotificationsHandler(),
    view: new ViewHandler()
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };