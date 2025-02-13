import { Task, TaskStatus } from '../types/task.js';
import { Notification, NotificationContent, NotificationPreferences, NotificationType } from '../types/notification.js';

export class NotificationService {
    /**
     * Create a notification for task assignment
     */
    public static createAssignmentNotification(
        task: Task,
        userId: string,
        serverId: string
    ): Omit<Notification, 'id'> {
        const content = this.formatTaskAssignmentContent(task);
        return {
            type: NotificationType.TASK_ASSIGNED,
            userId,
            serverId,
            taskId: task.id,
            message: content.description,
            read: false,
            scheduledFor: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Create a due date reminder notification
     */
    public static createDueReminderNotification(
        task: Task,
        userId: string,
        serverId: string,
        hoursBeforeDue: number
    ): Omit<Notification, 'id'> {
        const content = this.formatTaskDueContent(task);
        const dueDate = task.dueDate as Date;
        const scheduledFor = new Date(dueDate.getTime() - hoursBeforeDue * 60 * 60 * 1000);

        return {
            type: NotificationType.TASK_DUE_REMINDER,
            userId,
            serverId,
            taskId: task.id,
            message: content.description,
            read: false,
            scheduledFor,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Create an overdue notification
     */
    public static createOverdueNotification(
        task: Task,
        userId: string,
        serverId: string
    ): Omit<Notification, 'id'> {
        const content = this.formatTaskOverdueContent(task);
        return {
            type: NotificationType.TASK_OVERDUE,
            userId,
            serverId,
            taskId: task.id,
            message: content.description,
            read: false,
            scheduledFor: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Create a task completion notification
     */
    public static createCompletionNotification(
        task: Task,
        userId: string,
        serverId: string
    ): Omit<Notification, 'id'> {
        const content = this.formatTaskCompletionContent(task);
        return {
            type: NotificationType.TASK_COMPLETED,
            userId,
            serverId,
            taskId: task.id,
            message: content.description,
            read: false,
            scheduledFor: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Format task assignment notification content
     */
    private static formatTaskAssignmentContent(task: Task): NotificationContent {
        return {
            title: '🎯 Task Assignment',
            description: `<@${task.assigneeId}> has been assigned to task: ${task.title}`,
            fields: [
                {
                    name: 'Description',
                    value: task.description || 'No description provided',
                    inline: false
                },
                {
                    name: 'Due Date',
                    value: task.dueDate ? task.dueDate.toLocaleDateString() : 'No due date',
                    inline: true
                },
                {
                    name: 'Status',
                    value: task.status,
                    inline: true
                }
            ],
            color: 0x3498db // Blue
        };
    }

    /**
     * Format task due reminder notification content
     */
    private static formatTaskDueContent(task: Task): NotificationContent {
        return {
            title: '⏰ Task Due Reminder',
            description: `<@${task.assigneeId}>'s task is due soon: ${task.title}`,
            fields: [
                {
                    name: 'Description',
                    value: task.description || 'No description provided',
                    inline: false
                },
                {
                    name: 'Due Date',
                    value: task.dueDate ? task.dueDate.toLocaleDateString() : 'No due date',
                    inline: true
                },
                {
                    name: 'Status',
                    value: task.status,
                    inline: true
                }
            ],
            color: 0xf1c40f // Yellow
        };
    }

    /**
     * Format task overdue notification content
     */
    private static formatTaskOverdueContent(task: Task): NotificationContent {
        return {
            title: '❗ Task Overdue',
            description: `<@${task.assigneeId}>'s task is overdue: ${task.title}`,
            fields: [
                {
                    name: 'Description',
                    value: task.description || 'No description provided',
                    inline: false
                },
                {
                    name: 'Due Date',
                    value: task.dueDate ? task.dueDate.toLocaleDateString() : 'No due date',
                    inline: true
                },
                {
                    name: 'Status',
                    value: task.status,
                    inline: true
                }
            ],
            color: 0xe74c3c // Red
        };
    }

    /**
     * Format task completion notification content
     */
    private static formatTaskCompletionContent(task: Task): NotificationContent {
        return {
            title: '✅ Task Completed',
            description: task.assigneeId 
                ? `<@${task.assigneeId}> has completed task: ${task.title}`
                : `Task has been completed: ${task.title}`,
            fields: [
                {
                    name: 'Description',
                    value: task.description || 'No description provided',
                    inline: false
                },
                {
                    name: 'Completion Date',
                    value: task.completedDate ? task.completedDate.toLocaleDateString() : 'Unknown',
                    inline: true
                }
            ],
            color: 0x2ecc71 // Green
        };
    }

    /**
     * Create default notification preferences
     */
    public static createDefaultPreferences(
        userId: string,
        serverId: string
    ): Omit<NotificationPreferences, 'id'> {
        return {
            userId,
            serverId,
            discordDm: true,
            reminderHours: 24,
            dailyDigest: true,
            digestTime: '09:00',
            notifyOnAssignment: true,
            notifyOnCompletion: true,
            notifyOnDue: true,
            notifyOnOverdue: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
}