import { PermissionHandler } from './permissionHandler.js';
import { StatsHandlers } from '../types.js';

const handlers: StatsHandlers = {
    permission: new PermissionHandler()
    // Add future stat handlers here
};

// Export as a single object to ensure handlers are initialized only once
export { handlers };