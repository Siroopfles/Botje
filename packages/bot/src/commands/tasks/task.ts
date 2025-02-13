import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { TaskStatus, RecurrenceType } from 'shared';
import { createTaskRepository, connect, TaskDocument } from 'database';

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
                        dueDate = new Date(dueDateStr);
                        if (isNaN(dueDate.getTime())) {
                            await interaction.editReply('Invalid date format. Please use YYYY-MM-DD');
                            return;
                        }

                        if (dueDate < new Date()) {
                            await interaction.editReply('Due date must be in the future');
                            return;
                        }
                    }

                    // Validate recurrence settings
                    if (recurrenceType && !interval) {
                        await interaction.editReply('Interval is required when setting recurrence');
                        return;
                    }

                    const recurrence = recurrenceType && interval ? {
                        type: recurrenceType,
                        interval,
                        dayOfWeek: recurrenceType === RecurrenceType.WEEKLY ? [dueDate?.getDay() ?? 0] : undefined,
                        dayOfMonth: recurrenceType === RecurrenceType.MONTHLY ? [dueDate?.getDate() ?? 1] : undefined
                    } : undefined;

                    const taskRepo = createTaskRepository();
                    
                    const task = await taskRepo.create({
                        title,
                        description,
                        assigneeId: assignTo?.id,
                        dueDate,
                        status: TaskStatus.PENDING,
                        serverId: interaction.guildId!,
                        recurrence
                    });

                    const response = [
                        '✅ Task created successfully:',
                        `**Title:** ${task.title}`,
                        description ? `**Description:** ${description}` : null,
                        assignTo ? `**Assigned to:** ${assignTo.toString()}` : null,
                        dueDate ? `**Due Date:** ${dueDate.toLocaleDateString()}` : null,
                        recurrence ? `**Recurrence:** Every ${interval} ${recurrence.type.toLowerCase()}(s)` : null
                    ].filter(Boolean).join('\n');

                    await interaction.editReply(response);
                    break;
                }

                case 'list': {
                    const status = interaction.options.getString('status') as TaskStatus | null;
                    const taskRepo = createTaskRepository();
                    
                    const tasks = status 
                        ? await taskRepo.findByStatusAndServer(interaction.guildId!, status)
                        : await taskRepo.findByServerId(interaction.guildId!);

                    if (tasks.length === 0) {
                        await interaction.editReply('No tasks found.');
                        return;
                    }

                    const response = [
                        `📋 Tasks${status ? ` (${status})` : ''}:`,
                        '',
                        ...tasks.map((task: TaskDocument, index: number) => [
                            `${index + 1}. **${task.title}**`,
                            task.description ? `   Description: ${task.description}` : null,
                            task.assigneeId ? `   Assigned to: <@${task.assigneeId}>` : null,
                            task.dueDate ? `   Due: ${new Date(task.dueDate).toLocaleDateString()}` : null,
                            `   Status: ${task.status}`,
                            task.recurrence ? `   Repeats: Every ${task.recurrence.interval} ${task.recurrence.type.toLowerCase()}(s)` : null,
                            ''
                        ].filter(Boolean).join('\n'))
                    ].join('\n');

                    await interaction.editReply(response);
                    break;
                }
            }
        } catch (error) {
            console.error('Error executing task command:', error);
            await interaction.editReply('There was an error executing the command. Please try again.');
        }
    }
};