export interface NotificationPreferences {
    id?: string;
    userId: string;
    serverId: string;
    // Notification channels
    discordDm: boolean;
    // Timing preferences
    reminderHours: number; // Hours before due date
    dailyDigest: boolean;
    digestTime?: string; // HH:mm format
    // Event preferences
    notifyOnAssignment: boolean;
    notifyOnCompletion: boolean;
    notifyOnDue: boolean;
    notifyOnOverdue: boolean;
    // Rate limiting
    maxDailyNotifications?: number; // Max notifications per day (0 = unlimited)
    createdAt: Date;
    updatedAt: Date;
}

export enum NotificationType {
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    TASK_DUE_REMINDER = 'TASK_DUE_REMINDER',
    TASK_OVERDUE = 'TASK_OVERDUE',
    TASK_COMPLETED = 'TASK_COMPLETED',
    DAILY_DIGEST = 'DAILY_DIGEST'
}

export interface Notification {
    id?: string;
    type: NotificationType;
    userId: string;
    serverId: string;
    taskId?: string;
    message: string;
    read: boolean;
    scheduledFor: Date;
    sentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationContent {
    title: string;
    description: string;
    fields?: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
    color?: number; // Discord embed color
}

export interface ServerNotificationSettings {
    maxDailyServerNotifications?: number; // Max notifications per server per day (0 = unlimited)
    notificationRetentionDays?: number; // Days to keep notifications before cleanup
    cleanupUnreadAfterDays?: number; // Days to keep unread notifications
}
