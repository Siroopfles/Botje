import { NotificationHandler } from './notificationHandler.js';
import { TestHandlers } from '../types.js';

const handlers: TestHandlers = {
    notification: new NotificationHandler()
    // Add more test handlers here as needed
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };