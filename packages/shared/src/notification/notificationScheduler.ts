import { Task } from '../types/task.js';
import { Notification, NotificationPreferences, NotificationType } from '../types/notification.js';
import { NotificationService } from './notificationService.js';

export interface ScheduledNotification {
    notification: Omit<Notification, 'id'>;
    task: Task;
    preferences: NotificationPreferences;
}

export class NotificationScheduler {
    /**
     * Schedule notifications for a task based on user preferences
     */
    public static scheduleNotifications(
        task: Task,
        userPreferences: NotificationPreferences
    ): ScheduledNotification[] {
        const notifications: ScheduledNotification[] = [];

        // Only schedule notifications if the task has an assignee and due date
        if (!task.assigneeId || !task.dueDate) {
            return notifications;
        }

        // Assignment notification
        if (userPreferences.notifyOnAssignment) {
            notifications.push({
                notification: NotificationService.createAssignmentNotification(
                    task,
                    userPreferences.userId,
                    userPreferences.serverId
                ),
                task,
                preferences: userPreferences
            });
        }

        // Due date reminder
        if (userPreferences.notifyOnDue && task.dueDate) {
            const reminderHours = userPreferences.reminderHours || 24;
            notifications.push({
                notification: NotificationService.createDueReminderNotification(
                    task,
                    userPreferences.userId,
                    userPreferences.serverId,
                    reminderHours
                ),
                task,
                preferences: userPreferences
            });
        }

        return notifications;
    }

    /**
     * Get notifications that are due to be sent
     */
    public static getDueNotifications(
        notifications: ScheduledNotification[],
        currentTime: Date = new Date()
    ): ScheduledNotification[] {
        return notifications.filter(({ notification }) => {
            // Skip notifications that have already been sent
            if (notification.sentAt) {
                return false;
            }

            // Check if it's time to send the notification
            return notification.scheduledFor <= currentTime;
        });
    }

    /**
     * Check if a task is overdue and create overdue notification if needed
     */
    public static checkOverdueTask(
        task: Task,
        userPreferences: NotificationPreferences,
        currentTime: Date = new Date()
    ): ScheduledNotification | null {
        // Only check for overdue if task has due date and isn't already completed
        if (!task.dueDate || task.completedDate || task.status === 'COMPLETED') {
            return null;
        }

        // Only create overdue notification if task just became overdue
        // Add a small buffer (5 minutes) to avoid edge cases
        const overdueThreshold = new Date(task.dueDate);
        const recentlyOverdue = new Date(currentTime.getTime() - 5 * 60000); // 5 minutes ago

        if (task.dueDate < currentTime && overdueThreshold >= recentlyOverdue && userPreferences.notifyOnOverdue) {
            return {
                notification: NotificationService.createOverdueNotification(
                    task,
                    userPreferences.userId,
                    userPreferences.serverId
                ),
                task,
                preferences: userPreferences
            };
        }

        return null;
    }

    /**
     * Format daily digest content
     */
    public static formatDailyDigest(tasks: Task[]): string {
        if (tasks.length === 0) {
            return 'No tasks due today.';
        }

        const sections = {
            overdue: tasks.filter(t => new Date(t.dueDate!) < new Date() && t.status !== 'COMPLETED'),
            dueToday: tasks.filter(t => {
                const dueDate = new Date(t.dueDate!);
                const today = new Date();
                return dueDate.toDateString() === today.toDateString() && t.status !== 'COMPLETED';
            }),
            completed: tasks.filter(t => t.status === 'COMPLETED')
        };

        const content = ['📋 **Daily Task Digest**\n'];

        if (sections.overdue.length > 0) {
            content.push('⚠️ **Overdue Tasks**');
            sections.overdue.forEach(task => {
                content.push(`- ${task.title} (Due: ${new Date(task.dueDate!).toLocaleDateString()})`);
            });
            content.push('');
        }

        if (sections.dueToday.length > 0) {
            content.push('📅 **Due Today**');
            sections.dueToday.forEach(task => {
                content.push(`- ${task.title}`);
            });
            content.push('');
        }

        if (sections.completed.length > 0) {
            content.push('✅ **Completed**');
            sections.completed.forEach(task => {
                content.push(`- ${task.title}`);
            });
        }

        return content.join('\n');
    }

    /**
     * Check if it's time for daily digest
     */
    public static shouldSendDailyDigest(
        preferences: NotificationPreferences,
        currentTime: Date = new Date()
    ): boolean {
        if (!preferences.dailyDigest) {
            return false;
        }

        const [hours, minutes] = (preferences.digestTime || '09:00').split(':').map(Number);
        const digestTime = new Date(currentTime);
        digestTime.setHours(hours, minutes, 0, 0);

        // Check if current time matches digest time (within the same minute)
        const timeDiff = Math.abs(currentTime.getTime() - digestTime.getTime());
        return timeDiff < 60000; // Within one minute
    }
}