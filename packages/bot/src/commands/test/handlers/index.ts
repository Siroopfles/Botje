import { NotificationHandler } from './notificationHandler.js';
import { PingHandler } from './pingHandler.js';
import { TestHandlers } from '../types.js';

const handlers: TestHandlers = {
    notification: new NotificationHandler(),
    ping: new PingHandler()
    // Add more test handlers here as needed
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };