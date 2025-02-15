import { NotificationHandler } from './notificationHandler.js';
import { SystemHandler } from './systemHandler.js';
import { TestHandlers } from '../types.js';

const handlers: TestHandlers = {
    notification: new NotificationHandler(),
    system: new SystemHandler()
    // Add more test handlers here as needed
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };