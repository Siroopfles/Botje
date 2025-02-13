import { Client } from 'discord.js';
import { 
    NotificationScheduler, 
    ScheduledNotification,
    NotificationService,
    Task,
    NotificationPreferences
} from 'shared';
import { 
    createNotificationRepository,
    createNotificationPreferencesRepository,
    createTaskRepository,
    NotificationDocument,
    NotificationPreferencesDocument
} from 'database';

const notificationRepository = createNotificationRepository();
const preferencesRepository = createNotificationPreferencesRepository();
const taskRepository = createTaskRepository();

export class NotificationWorker {
    private client: Client;
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly CHECK_INTERVAL = 60000; // Check every minute

    constructor(client: Client) {
        this.client = client;
    }

    /**
     * Start the notification worker
     */
    public start(): void {
        if (this.checkInterval) {
            return;
        }

        this.checkInterval = setInterval(() => this.checkNotifications(), this.CHECK_INTERVAL);
        console.log('Notification worker started');
    }

    /**
     * Stop the notification worker
     */
    public stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('Notification worker stopped');
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
            // Get the guild (server)
            const guild = await this.client.guilds.fetch(preferences.serverId);
            if (!guild) {
                console.error(`Guild not found: ${preferences.serverId}`);
                return;
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

            // If we have a document reference, mark it as sent
            if (notificationDoc) {
                await notificationRepository.markAsSent(notificationDoc._id.toString());
            }

        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    /**
     * Process daily digests for a server
     */
    private async processDailyDigestsForServer(serverId: string): Promise<void> {
        const currentTime = new Date();

        // Get all notification preferences for this server
        const allPreferences = await preferencesRepository.findByServerId(serverId);

        for (const prefs of allPreferences) {
            const preferences: NotificationPreferences = {
                id: prefs._id.toString(),
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

            // Get user preferences for these notifications
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
                    id: prefsDoc._id.toString(),
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

                const notification = {
                    type: notificationDoc.type,
                    userId: notificationDoc.userId,
                    serverId: notificationDoc.serverId,
                    taskId: notificationDoc.taskId,
                    message: notificationDoc.message,
                    read: notificationDoc.read,
                    scheduledFor: notificationDoc.scheduledFor,
                    sentAt: notificationDoc.sentAt,
                    createdAt: notificationDoc.createdAt,
                    updatedAt: notificationDoc.updatedAt
                };

                if (notification.taskId) {
                    const task = await taskRepository.findById(notification.taskId);
                    if (!task) {
                        console.error(`Task not found: ${notification.taskId}`);
                        continue;
                    }

                    await this.sendNotification({
                        notification,
                        task,
                        preferences
                    }, notificationDoc);
                }
            }

            // Check for overdue tasks in each server
            for (const guild of guilds) {
                const pendingTasks = await taskRepository.findOverdueTasks(guild.id);
                for (const task of pendingTasks) {
                    if (task.assigneeId) {
                        const prefsDoc = await preferencesRepository.findByUserId(
                            task.assigneeId,
                            task.serverId
                        );

                        if (prefsDoc?.notifyOnOverdue) {
                            const preferences: NotificationPreferences = {
                                id: prefsDoc._id.toString(),
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
                            }
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error in notification worker:', error);
        }
    }
}