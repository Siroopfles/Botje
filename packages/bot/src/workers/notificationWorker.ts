import { Client, TextChannel } from 'discord.js';
import { 
    NotificationScheduler, 
    ScheduledNotification,
    NotificationService,
    Task,
    NotificationPreferences,
    ServerNotificationSettings,
    NotificationType,
    TaskStatus
} from 'shared';
import { 
    createNotificationRepository,
    createNotificationPreferencesRepository,
    createTaskRepository,
    createServerSettingsRepository,
    NotificationDocument,
    NotificationPreferencesDocument
} from 'database';

const notificationRepository = createNotificationRepository();
const preferencesRepository = createNotificationPreferencesRepository();
const taskRepository = createTaskRepository();
const serverSettingsRepository = createServerSettingsRepository();

// Default retention settings
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_UNREAD_RETENTION_DAYS = 90;

export class NotificationWorker {
    private client: Client;
    private checkInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private readonly CHECK_INTERVAL = 60000; // Check every minute
    private readonly CLEANUP_INTERVAL = 3600000; // Cleanup every hour
    private lastOverdueCheck: Map<string, number> = new Map(); // Track last overdue check by task ID
    private dailyNotificationCounts: Map<string, number> = new Map(); // Track daily notifications per user
    private dailyServerCounts: Map<string, number> = new Map(); // Track daily notifications per server

    constructor(client: Client) {
        this.client = client;
        // Reset counts at midnight
        this.scheduleCountReset();
    }

    /**
     * Start the notification worker
     */
    public start(): void {
        if (this.checkInterval || this.cleanupInterval) {
            return;
        }

        this.checkInterval = setInterval(() => this.checkNotifications(), this.CHECK_INTERVAL);
        this.cleanupInterval = setInterval(() => this.runCleanup(), this.CLEANUP_INTERVAL);
        console.log('Notification worker started');
    }

    /**
     * Stop the notification worker
     */
    public stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        console.log('Notification worker stopped');
    }

    /**
     * Schedule daily count reset
     */
    private scheduleCountReset(): void {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0);
        
        const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
        
        setTimeout(() => {
            this.dailyNotificationCounts.clear();
            this.dailyServerCounts.clear();
            this.scheduleCountReset(); // Schedule next reset
        }, timeUntilMidnight);
    }

    /**
     * Check rate limits before sending
     */
    private async checkRateLimits(
        userId: string,
        serverId: string,
        preferences: NotificationPreferences
    ): Promise<boolean> {
        // Check user daily limit
        const userKey = `${userId}-${serverId}`;
        const userCount = this.dailyNotificationCounts.get(userKey) || 0;
        if (preferences.maxDailyNotifications && userCount >= preferences.maxDailyNotifications) {
            console.log(`User ${userId} hit daily notification limit`);
            return false;
        }

        // Check server daily limit
        const serverCount = this.dailyServerCounts.get(serverId) || 0;
        const serverSettings = await serverSettingsRepository.getNotificationSettings(serverId);
        if (serverSettings.maxDailyServerNotifications && 
            serverCount >= serverSettings.maxDailyServerNotifications) {
            console.log(`Server ${serverId} hit daily notification limit`);
            return false;
        }

        return true;
    }

    /**
     * Update notification counts
     */
    private updateNotificationCounts(userId: string, serverId: string): void {
        const userKey = `${userId}-${serverId}`;
        this.dailyNotificationCounts.set(userKey, (this.dailyNotificationCounts.get(userKey) || 0) + 1);
        this.dailyServerCounts.set(serverId, (this.dailyServerCounts.get(serverId) || 0) + 1);
    }

    /**
     * Run cleanup of old notifications
     */
    private async runCleanup(): Promise<void> {
        try {
            // Get all guilds for cleanup
            const guilds = Array.from(this.client.guilds.cache.values());
            
            for (const guild of guilds) {
                const settings = await serverSettingsRepository.getNotificationSettings(guild.id);
                
                // Clean up read notifications using server setting or default
                const retentionDays = settings.notificationRetentionDays ?? DEFAULT_RETENTION_DAYS;
                const readCleanupDate = new Date();
                readCleanupDate.setDate(readCleanupDate.getDate() - retentionDays);
                await notificationRepository.cleanup(readCleanupDate, true);

                // Clean up old unread notifications
                const unreadRetentionDays = settings.cleanupUnreadAfterDays ?? DEFAULT_UNREAD_RETENTION_DAYS;
                const unreadCleanupDate = new Date();
                unreadCleanupDate.setDate(unreadCleanupDate.getDate() - unreadRetentionDays);
                await notificationRepository.cleanup(unreadCleanupDate, false);

                // Clean up completed task notifications
                const completedTasks = await taskRepository.findByStatusAndServer(guild.id, TaskStatus.COMPLETED);
                for (const task of completedTasks) {
                    await notificationRepository.archiveForTask(task.id);
                }
            }

            console.log('Notification cleanup completed');
        } catch (error) {
            console.error('Error during notification cleanup:', error);
        }
    }

    /**
     * Process daily digests for a server
     */
    private async processDailyDigestsForServer(serverId: string): Promise<void> {
        const currentTime = new Date();

        // Get server settings for notification channel
        const serverSettings = await serverSettingsRepository.findByServerId(serverId);

        // Get all notification preferences for this server
        const allPreferences = await preferencesRepository.findByServerId(serverId);

        for (const prefs of allPreferences) {
            const preferences: NotificationPreferences = {
                id: prefs.id,
                userId: prefs.userId,
                serverId: prefs.serverId,
                discordDm: prefs.discordDm,
                reminderHours: prefs.reminderHours,
                dailyDigest: prefs.dailyDigest,
                digestTime: prefs.digestTime,
                notifyOnAssignment: prefs.notifyOnAssignment,
                notifyOnCompletion: prefs.notifyOnCompletion,
                notifyOnDue: prefs.notifyOnDue,
                notifyOnOverdue: prefs.notifyOnOverdue,
                createdAt: prefs.createdAt,
                updatedAt: prefs.updatedAt
            };

            if (NotificationScheduler.shouldSendDailyDigest(preferences, currentTime)) {
                // Get user's tasks
                const tasks = await taskRepository.findByAssignee(preferences.userId);
                
                if (tasks.length > 0) {
                    const digestContent = NotificationScheduler.formatDailyDigest(tasks);

                    // Send to server notification channel if configured
                    if (serverSettings?.notificationChannelId) {
                        try {
                            const guild = await this.client.guilds.fetch(serverId);
                            const channel = await guild.channels.fetch(serverSettings.notificationChannelId);
                            if (channel && channel instanceof TextChannel) {
                                await channel.send({
                                    content: `Daily Digest for <@${preferences.userId}>:\n${digestContent}`
                                });
                            }
                        } catch (error) {
                            console.error(`Failed to send daily digest to channel:`, error);
                        }
                    }
                    
                    // Send to DM if enabled
                    if (preferences.discordDm) {
                        try {
                            const user = await this.client.users.fetch(preferences.userId);
                            await user.send({ content: digestContent });
                        } catch (error) {
                            console.error(`Failed to send daily digest to user ${preferences.userId}:`, error);
                        }
                    }
                }
            }
        }
    }

    /**
     * Send a notification through Discord
     */
    private async sendNotification(
        scheduled: ScheduledNotification,
        notificationDoc?: NotificationDocument
    ): Promise<void> {
        const { notification, task, preferences } = scheduled;

        try {
            // Check rate limits
            if (!await this.checkRateLimits(preferences.userId, preferences.serverId, preferences)) {
                return;
            }

            // Get the guild (server)
            const guild = await this.client.guilds.fetch(preferences.serverId);
            if (!guild) {
                console.error(`Guild not found: ${preferences.serverId}`);
                return;
            }

            // Get server settings for notification channel
            const serverSettings = await serverSettingsRepository.findByServerId(preferences.serverId);

            // Try to send to notification channel if configured
            if (serverSettings?.notificationChannelId) {
                try {
                    const channel = await guild.channels.fetch(serverSettings.notificationChannelId);
                    if (channel && channel instanceof TextChannel) {
                        await channel.send({ content: notification.message });
                    } else {
                        console.error(`Invalid notification channel for server ${preferences.serverId}`);
                    }
                } catch (error) {
                    console.error(`Failed to send to notification channel:`, error);
                }
            }

            // Always try to send to user's DM if enabled
            if (preferences.discordDm) {
                try {
                    const user = await this.client.users.fetch(preferences.userId);
                    await user.send({ content: notification.message });
                } catch (error) {
                    console.error(`Failed to send DM to user ${preferences.userId}:`, error);
                }
            }

            // Update notification counts
            this.updateNotificationCounts(preferences.userId, preferences.serverId);

            // If we have a document reference, mark it as sent
            if (notificationDoc) {
                await notificationRepository.markAsSent(notificationDoc.id);
            }

            // Track overdue notifications
            if (notification.type === NotificationType.TASK_OVERDUE && task) {
                this.lastOverdueCheck.set(task.id, Date.now());
            }

        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    /**
     * Check for and process notifications
     */
    private async checkNotifications(): Promise<void> {
        try {
            // Get all guilds the bot is in
            const guilds = Array.from(this.client.guilds.cache.values());

            // Process daily digests for each server
            for (const guild of guilds) {
                await this.processDailyDigestsForServer(guild.id);
            }

            // Get scheduled notifications that haven't been sent
            const notifications = await notificationRepository.findScheduled(
                new Date(Date.now() - 5 * 60000), // 5 minutes ago (to catch any missed ones)
                new Date()
            );

            for (const notificationDoc of notifications) {
                const prefsDoc = await preferencesRepository.findByUserId(
                    notificationDoc.userId,
                    notificationDoc.serverId
                );

                if (!prefsDoc) {
                    console.error(`No preferences found for user ${notificationDoc.userId}`);
                    continue;
                }

                // Convert document to interface type
                const preferences: NotificationPreferences = {
                    id: prefsDoc.id,
                    userId: prefsDoc.userId,
                    serverId: prefsDoc.serverId,
                    discordDm: prefsDoc.discordDm,
                    reminderHours: prefsDoc.reminderHours,
                    dailyDigest: prefsDoc.dailyDigest,
                    digestTime: prefsDoc.digestTime,
                    notifyOnAssignment: prefsDoc.notifyOnAssignment,
                    notifyOnCompletion: prefsDoc.notifyOnCompletion,
                    notifyOnDue: prefsDoc.notifyOnDue,
                    notifyOnOverdue: prefsDoc.notifyOnOverdue,
                    createdAt: prefsDoc.createdAt,
                    updatedAt: prefsDoc.updatedAt
                };

                if (notificationDoc.taskId) {
                    const task = await taskRepository.findById(notificationDoc.taskId);
                    if (!task) {
                        console.error(`Task not found: ${notificationDoc.taskId}`);
                        continue;
                    }

                    await this.sendNotification({
                        notification: notificationDoc,
                        task,
                        preferences
                    }, notificationDoc);
                }
            }

            // Check for overdue tasks in each server
            for (const guild of guilds) {
                const pendingTasks = await taskRepository.findByStatusAndServer(guild.id, TaskStatus.PENDING);
                for (const task of pendingTasks) {
                    if (task.dueDate && task.dueDate < new Date() && task.assigneeId) {
                        // Skip if we've recently sent an overdue notification
                        const lastCheck = this.lastOverdueCheck.get(task.id);
                        if (lastCheck && Date.now() - lastCheck < 3600000) { // 1 hour cooldown
                            continue;
                        }

                        const prefsDoc = await preferencesRepository.findByUserId(
                            task.assigneeId,
                            task.serverId
                        );

                        if (prefsDoc?.notifyOnOverdue) {
                            const preferences: NotificationPreferences = {
                                id: prefsDoc.id,
                                userId: prefsDoc.userId,
                                serverId: prefsDoc.serverId,
                                discordDm: prefsDoc.discordDm,
                                reminderHours: prefsDoc.reminderHours,
                                dailyDigest: prefsDoc.dailyDigest,
                                digestTime: prefsDoc.digestTime,
                                notifyOnAssignment: prefsDoc.notifyOnAssignment,
                                notifyOnCompletion: prefsDoc.notifyOnCompletion,
                                notifyOnDue: prefsDoc.notifyOnDue,
                                notifyOnOverdue: prefsDoc.notifyOnOverdue,
                                createdAt: prefsDoc.createdAt,
                                updatedAt: prefsDoc.updatedAt
                            };

                            const overdueNotification = NotificationScheduler.checkOverdueTask(
                                task,
                                preferences
                            );

                            if (overdueNotification) {
                                await this.sendNotification(overdueNotification);
                                // Update task status to overdue
                                await taskRepository.update(task.id, { status: TaskStatus.OVERDUE });
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }
}