import { ChatInputCommandInteraction } from 'discord.js';

// Command handler interfaces
export interface StatsCommandHandler {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface StatsHandlers {
  permission: StatsCommandHandler;
  // Future stat handlers can be added here
}

// Metrics interfaces
export interface MetricsResult {
  cacheHitRate: number;
  averageResponseTime: number;
  totalChecks: number;
  checksPerRole: { [key: string]: number };
  errorRate: number;
}

// Statistics time periods
export type Period = 'day' | 'week' | 'month' | 'all';

// Statistics interfaces
export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  tasksByStatus: Record<string, number>;
}

export interface UserMetrics {
  tasksCreated: number;
  tasksCompleted: number;
  tasksAssigned: number;
  completionRate: number;
  averageTaskTime: number;
  lastActive: Date;
}

export interface PermissionMetrics {
  userCount: number;
  managerCount: number;
  viewerCount: number;
  averagePermissions: number;
  permissionDistribution: Record<string, number>;
}