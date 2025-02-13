import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { TaskStatus, RecurrenceType } from 'shared';
import { createTaskRepository, connect } from 'database';

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

function formatTaskList(task: any, index: number): string {
    return [
        `${index + 1}. **${task.title}** (ID: ${task.id})`,
        task.description ? `   Description: ${task.description}` : null,
        task.assigneeId ? `   Assigned to: <@${task.assigneeId}>` : null,
        task.dueDate ? `   Due: ${new Date(task.dueDate).toLocaleDateString()}` : null,
        `   Status: ${task.status}`,
        task.recurrence?.type ? 
            `   Repeats: Every ${task.recurrence.interval} ${task.recurrence.type.toLowerCase()}(s)` : null,
        ''
    ].filter(Boolean).join('\n');
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

                    await interaction.editReply({
                        content: `✅ Task created successfully:\n${formatTaskSummary(task)}`
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

                    const response = [
                        `📋 Tasks${status ? ` (${status})` : ''}:`,
                        '',
                        ...tasks.map((task, index) => formatTaskList(task, index))
                    ].join('\n');

                    await interaction.editReply(response);
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

                    await interaction.editReply({
                        content: `✅ Task updated successfully:\n${formatTaskSummary(updatedTask)}`
                    });
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