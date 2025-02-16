import { handler as permission } from './permissionHandler.js';
import { handler as tasks } from './taskHandler.js';
import { handler as users } from './userHandler.js';
import type { StatsCommandHandler } from '../types.js';

// Define handlers type with actual handlers
export interface StatsHandlers {
  permission: StatsCommandHandler;
  tasks: StatsCommandHandler;
  users: StatsCommandHandler;
}

/**
 * Collection of all stats command handlers
 */
export const handlers: StatsHandlers = {
  permission,
  tasks,
  users
} as const;

// Re-export handler types
export type {
  StatsCommandHandler,
  MetricsResult,
  TaskMetrics,
  UserMetrics,
  PermissionMetrics
} from '../types.js';

// Re-export handlers for testing
export { 
  permission,
  tasks,
  users 
};