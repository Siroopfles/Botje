import { EmbedBuilder } from 'discord.js';
import { TaskMetrics, UserMetrics, PermissionMetrics } from './types.js';

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/**
 * Format a percentage value with fixed decimals
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format an error message for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Create a generic metrics embed
 */
export function createMetricsEmbed(title: string, metrics: Record<string, string | number>): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor('#0099ff')
    .addFields(
      Object.entries(metrics).map(([name, value]) => ({
        name,
        value: value.toString(),
        inline: true
      }))
    )
    .setTimestamp();
}

/**
 * Create an embed for task metrics
 */
export function createTaskMetricsEmbed(metrics: TaskMetrics, period: string): EmbedBuilder {
  return createMetricsEmbed(`📊 Task Statistics (${period})`, {
    'Total Tasks': formatNumber(metrics.totalTasks),
    'Completed Tasks': formatNumber(metrics.completedTasks),
    'Average Completion Time': `${metrics.averageCompletionTime.toFixed(1)} days`,
    'Tasks by Status': Object.entries(metrics.tasksByStatus)
      .map(([status, count]) => `${status}: ${formatNumber(count)}`)
      .join('\n')
  });
}

/**
 * Create an embed for user metrics
 */
export function createUserMetricsEmbed(metrics: UserMetrics, userName: string): EmbedBuilder {
  return createMetricsEmbed(`📊 Statistics for ${userName}`, {
    'Tasks Created': formatNumber(metrics.tasksCreated),
    'Tasks Completed': formatNumber(metrics.tasksCompleted),
    'Tasks Assigned': formatNumber(metrics.tasksAssigned),
    'Completion Rate': formatPercentage(metrics.completionRate),
    'Average Task Time': `${metrics.averageTaskTime.toFixed(1)} days`,
    'Last Active': metrics.lastActive.toLocaleString()
  });
}

/**
 * Create an embed for permission metrics
 */
export function createPermissionMetricsEmbed(metrics: PermissionMetrics): EmbedBuilder {
  return createMetricsEmbed('📊 Permission Statistics', {
    'Total Users': formatNumber(metrics.userCount),
    'Task Managers': formatNumber(metrics.managerCount),
    'Task Viewers': formatNumber(metrics.viewerCount),
    'Average Permissions': formatNumber(metrics.averagePermissions),
    'Permission Distribution': Object.entries(metrics.permissionDistribution)
      .map(([perm, count]) => `${perm}: ${formatPercentage(count)}`)
      .join('\n')
  });
}