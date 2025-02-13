import type { ServerNotificationSettings } from './notification.js';

export interface ServerSettings {
    id?: string;
    serverId: string;
    notificationChannelId?: string;
    maxDailyServerNotifications?: number;
    notificationRetentionDays?: number;
    cleanupUnreadAfterDays?: number;
    createdAt: Date;
    updatedAt: Date;
}

// Re-export for convenience
export type { ServerNotificationSettings };