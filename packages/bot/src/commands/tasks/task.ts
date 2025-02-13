import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { TaskStatus, RecurrenceType, NotificationService, NotificationScheduler } from 'shared';
import { createTaskRepository, createNotificationPreferencesRepository, createNotificationRepository, connect } from 'database';

function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

function formatTaskSummary(task: any): string {
    return [
        `**Task ID:** ${task.id}`,
        `**Title:** ${task.title}`,
        task.description ? `**Description:** ${task.description}` : null,
        task.assigneeId ? `**Assigned to:** <@${task.assigneeId}>` : null,
        task.dueDate ? `**Due Date:** ${new Date(task.dueDate).toLocaleDateString()}` : null,
        task.recurrence?.type ? 
            `**Recurrence:** Every ${task.recurrence.interval} ${task.recurrence.type.toLowerCase()}(s)` : null
    ].filter(Boolean).join('\n');
}

// Split tasks into pages that fit within Discord's message limit
function formatTaskPages(tasks: any[]): string[] {
    const pages: string[] = [];
    let currentPage = [`📋 Tasks (Page 1):`];
    let currentLength = currentPage[0].length;

    tasks.forEach((task, index) => {
        const taskEntry = [
            '',
            `${index + 1}. **${task.title}** (ID: ${task.id})`,
            task.description ? `   Description: ${task.description}` : null,
            task.assigneeId ? `   Assigned to: <@${task.assigneeId}>` : null,
            task.dueDate ? `   Due: ${new Date(task.dueDate).toLocaleDateString()}` : null,
            `   Status: ${task.status}`,
            task.recurrence?.type ?
                `   Repeats: Every ${task.recurrence.interval} ${task.recurrence.type.toLowerCase()}(s)` : null
        ].filter(Boolean).join('\n');

        // Check if adding this task would exceed Discord's limit
        if (currentLength + taskEntry.length > 1800) { // Leave some room for safety
            pages.push(currentPage.join('\n'));
            currentPage = [`📋 Tasks (Page ${pages.length + 1}):`];
            currentLength = currentPage[0].length;
        }

        currentPage.push(taskEntry);
        currentLength += taskEntry.length;
    });

    // Add the last page if it has content
    if (currentPage.length > 1) {
        pages.push(currentPage.join('\n'));
    }

    return pages;
}

async function scheduleTaskNotifications(task: any, serverId: string) {
    const notificationRepo = createNotificationRepository();
    const preferencesRepo = createNotificationPreferencesRepository();

    if (task.assigneeId) {
        let preferences = await preferencesRepo.findByUserId(task.assigneeId, serverId);
        if (!preferences) {
            // Create default preferences if none exist
            preferences = await preferencesRepo.create(
                NotificationService.createDefaultPreferences(task.assigneeId, serverId)
            );
        }

        // Schedule notifications for the task
        const notifications = NotificationScheduler.scheduleNotifications(task, preferences);
        for (const scheduled of notifications) {
            await notificationRepo.create({
                ...scheduled.notification,
                scheduledFor: scheduled.notification.scheduledFor
            });
        }

        return notifications.length;
    }

    return 0;
}

export const task: Command = {
    data: new SlashCommandBuilder()
        .setName('task')
        .setDescription('Manage tasks')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new task')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('The title of the task')
                        .setRequired(true)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description of the task')
                        .setRequired(false)
                        .setMaxLength(1000)
                )
                .addUserOption(option =>
                    option
                        .setName('assign-to')
                        .setDescription('User to assign the task to')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('due-date')
                        .setDescription('When the task is due (YYYY-MM-DD)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('recurrence')
                        .setDescription('How often the task should repeat')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Daily', value: RecurrenceType.DAILY },
                            { name: 'Weekly', value: RecurrenceType.WEEKLY },
                            { name: 'Monthly', value: RecurrenceType.MONTHLY }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('interval')
                        .setDescription('Interval for recurrence (e.g., every 2 days)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all tasks')
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Filter tasks by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Pending', value: TaskStatus.PENDING },
                            { name: 'In Progress', value: TaskStatus.IN_PROGRESS },
                            { name: 'Completed', value: TaskStatus.COMPLETED },
                            { name: 'Overdue', value: TaskStatus.OVERDUE }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing task')
                .addStringOption(option =>
                    option
                        .setName('task-id')
                        .setDescription('ID of the task to edit')
                        .setRequired(true)
                        .setMinLength(24)
                        .setMaxLength(24)
                )
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('New title for the task')
                        .setRequired(false)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('New description for the task')
                        .setRequired(false)
                        .setMaxLength(1000)
                )
                .addUserOption(option =>
                    option
                        .setName('assign-to')
                        .setDescription('New assignee for the task')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('due-date')
                        .setDescription('New due date (YYYY-MM-DD)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a task')
                .addStringOption(option =>
                    option
                        .setName('task-id')
                        .setDescription('ID of the task to delete')
                        .setRequired(true)
                        .setMinLength(24)
                        .setMaxLength(24)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Mark a task as completed')
                .addStringOption(option =>
                    option
                        .setName('task-id')
                        .setDescription('ID of the task to complete')
                        .setRequired(true)
                        .setMinLength(24)
                        .setMaxLength(24)
                )
        ),

    execute: async (interaction) => {
        await interaction.deferReply();

        try {
            // Ensure database connection
            if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
                throw new Error('Database configuration missing');
            }

            await connect({
                uri: process.env.MONGODB_URI,
                dbName: process.env.MONGODB_DB_NAME
            });

            const subcommand = interaction.options.getSubcommand();
            const taskRepo = createTaskRepository();

            switch (subcommand) {
                case 'create': {
                    const title = interaction.options.getString('title', true);
                    const description = interaction.options.getString('description') ?? undefined;
                    const assignTo = interaction.options.getUser('assign-to');
                    const dueDateStr = interaction.options.getString('due-date');
                    const recurrenceType = interaction.options.getString('recurrence') as RecurrenceType | null;
                    const interval = interaction.options.getInteger('interval');

                    let dueDate: Date | undefined;
                    if (dueDateStr) {
                        if (!isValidDate(dueDateStr)) {
                            await interaction.editReply('❌ Invalid date format. Please use YYYY-MM-DD');
                            return;
                        }

                        dueDate = new Date(dueDateStr);
                        if (dueDate < new Date()) {
                            await interaction.editReply('❌ Due date must be in the future');
                            return;
                        }
                    }

                    if (recurrenceType && !interval) {
                        await interaction.editReply('❌ Interval is required when setting recurrence');
                        return;
                    }

                    const recurrence = recurrenceType && interval ? {
                        type: recurrenceType,
                        interval,
                        dayOfWeek: recurrenceType === RecurrenceType.WEEKLY ? [dueDate?.getDay() ?? 0] : undefined,
                        dayOfMonth: recurrenceType === RecurrenceType.MONTHLY ? [dueDate?.getDate() ?? 1] : undefined
                    } : undefined;

                    const task = await taskRepo.create({
                        title,
                        description,
                        assigneeId: assignTo?.id,
                        dueDate,
                        status: TaskStatus.PENDING,
                        serverId: interaction.guildId!,
                        recurrence
                    });

                    // Schedule notifications if task has assignee
                    const notificationCount = await scheduleTaskNotifications(task, interaction.guildId!);

                    const response = [
                        `✅ Task created successfully:`,
                        formatTaskSummary(task)
                    ];

                    if (notificationCount > 0) {
                        response.push('', `📬 Scheduled ${notificationCount} notification(s) for this task.`);
                    }

                    await interaction.editReply({
                        content: response.join('\n')
                    });
                    break;
                }

                case 'edit': {
                    const taskId = interaction.options.getString('task-id', true);
                    const task = await taskRepo.findById(taskId);

                    if (!task) {
                        await interaction.editReply('❌ Task not found. Please check the ID and try again.');
                        return;
                    }

                    if (task.serverId !== interaction.guildId) {
                        await interaction.editReply('❌ You can only edit tasks from this server.');
                        return;
                    }

                    const title = interaction.options.getString('title');
                    const description = interaction.options.getString('description');
                    const assignTo = interaction.options.getUser('assign-to');
                    const dueDateStr = interaction.options.getString('due-date');

                    let dueDate: Date | undefined;
                    if (dueDateStr) {
                        if (!isValidDate(dueDateStr)) {
                            await interaction.editReply('❌ Invalid date format. Please use YYYY-MM-DD');
                            return;
                        }

                        dueDate = new Date(dueDateStr);
                        if (dueDate < new Date()) {
                            await interaction.editReply('❌ Due date must be in the future');
                            return;
                        }
                    }

                    const updates: any = {};
                    if (title) updates.title = title;
                    if (description !== null) updates.description = description || undefined;
                    if (assignTo) updates.assigneeId = assignTo.id;
                    if (dueDate) updates.dueDate = dueDate;

                    const updatedTask = await taskRepo.update(taskId, updates);
                    if (!updatedTask) {
                        await interaction.editReply('❌ Failed to update task.');
                        return;
                    }

                    // Schedule new notifications if assignee changed
                    let notificationCount = 0;
                    if (assignTo && assignTo.id !== task.assigneeId) {
                        notificationCount = await scheduleTaskNotifications(updatedTask, interaction.guildId!);
                    }

                    const response = [
                        `✅ Task updated successfully:`,
                        formatTaskSummary(updatedTask)
                    ];

                    if (notificationCount > 0) {
                        response.push('', `📬 Scheduled ${notificationCount} notification(s) for this task.`);
                    }

                    await interaction.editReply({
                        content: response.join('\n')
                    });
                    break;
                }

                case 'list': {
                    const status = interaction.options.getString('status') as TaskStatus | null;
                    
                    const tasks = status 
                        ? await taskRepo.findByStatusAndServer(interaction.guildId!, status)
                        : await taskRepo.findByServerId(interaction.guildId!);

                    if (tasks.length === 0) {
                        await interaction.editReply('📋 No tasks found.');
                        return;
                    }

                    const pages = formatTaskPages(tasks);
                    
                    // Send first page as reply
                    await interaction.editReply(pages[0]);

                    // Send remaining pages as follow-up messages
                    for (let i = 1; i < pages.length; i++) {
                        await interaction.followUp(pages[i]);
                    }
                    break;
                }

                case 'delete': {
                    const taskId = interaction.options.getString('task-id', true);
                    const task = await taskRepo.findById(taskId);

                    if (!task) {
                        await interaction.editReply('❌ Task not found. Please check the ID and try again.');
                        return;
                    }

                    if (task.serverId !== interaction.guildId) {
                        await interaction.editReply('❌ You can only delete tasks from this server.');
                        return;
                    }

                    const deleted = await taskRepo.delete(taskId);
                    if (!deleted) {
                        await interaction.editReply('❌ Failed to delete task.');
                        return;
                    }

                    await interaction.editReply(`✅ Task "${task.title}" has been deleted.`);
                    break;
                }

                case 'complete': {
                    const taskId = interaction.options.getString('task-id', true);
                    const task = await taskRepo.findById(taskId);

                    if (!task) {
                        await interaction.editReply('❌ Task not found. Please check the ID and try again.');
                        return;
                    }

                    if (task.serverId !== interaction.guildId) {
                        await interaction.editReply('❌ You can only complete tasks from this server.');
                        return;
                    }

                    if (task.status === TaskStatus.COMPLETED) {
                        await interaction.editReply('ℹ️ This task is already completed.');
                        return;
                    }

                    const completedTask = await taskRepo.update(taskId, {
                        status: TaskStatus.COMPLETED,
                        completedDate: new Date()
                    });

                    if (!completedTask) {
                        await interaction.editReply('❌ Failed to complete task.');
                        return;
                    }

                    await interaction.editReply(`✅ Task "${task.title}" has been marked as completed.`);
                    break;
                }
            }
        } catch (error) {
            console.error('Error executing task command:', error);
            await interaction.editReply('❌ There was an error executing the command. Please try again.');
        }
    }
};