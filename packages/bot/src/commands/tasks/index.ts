import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/command.js';
import { TaskStatus, RecurrenceType } from 'shared';
import { handlers } from './handlers/index.js';

export const tasks: Command = {
    data: new SlashCommandBuilder()
        .setName('tasks')
        .setDescription('Manage tasks')
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new task')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Task title')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Task description')
                )
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign the task to')
                )
                .addStringOption(option =>
                    option
                        .setName('due-date')
                        .setDescription('Due date (YYYY-MM-DD or YYYY-MM-DD HH:MM)')
                )
                .addBooleanOption(option =>
                    option
                        .setName('recurring')
                        .setDescription('Set up task recurrence')
                )
                .addStringOption(option =>
                    option
                        .setName('recurrence-type')
                        .setDescription('Type of recurrence')
                        .addChoices(
                            { name: 'Daily', value: RecurrenceType.DAILY },
                            { name: 'Weekly', value: RecurrenceType.WEEKLY },
                            { name: 'Monthly', value: RecurrenceType.MONTHLY }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('interval')
                        .setDescription('Recurrence interval (e.g., every X days)')
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option
                        .setName('days')
                        .setDescription('Days for weekly/monthly recurrence (comma-separated)')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List tasks')
                .addStringOption(option =>
                    option
                        .setName('view')
                        .setDescription('View format')
                        .addChoices(
                            { name: 'List', value: 'list' },
                            { name: 'Detailed', value: 'detailed' }
                        )
                )
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('Filter by assignee')
                )
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Filter by status')
                        .addChoices(
                            { name: 'Pending', value: TaskStatus.PENDING },
                            { name: 'In Progress', value: TaskStatus.IN_PROGRESS },
                            { name: 'Completed', value: TaskStatus.COMPLETED }
                        )
                )
                .addBooleanOption(option =>
                    option
                        .setName('overdue')
                        .setDescription('Show only overdue tasks')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a task')
                .addStringOption(option =>
                    option
                        .setName('task-id')
                        .setDescription('ID of the task to edit')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('New task title')
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('New task description')
                )
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('New assignee')
                )
                .addStringOption(option =>
                    option
                        .setName('due-date')
                        .setDescription('New due date (YYYY-MM-DD or YYYY-MM-DD HH:MM)')
                )
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('New status')
                        .addChoices(
                            { name: 'Pending', value: TaskStatus.PENDING },
                            { name: 'In Progress', value: TaskStatus.IN_PROGRESS },
                            { name: 'Completed', value: TaskStatus.COMPLETED }
                        )
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
                )
                .addBooleanOption(option =>
                    option
                        .setName('force')
                        .setDescription('Force delete completed tasks')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Mark a task as complete')
                .addStringOption(option =>
                    option
                        .setName('task-id')
                        .setDescription('ID of the task')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('uncomplete')
                        .setDescription('Mark as incomplete instead')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('assign')
                .setDescription('Assign a task')
                .addStringOption(option =>
                    option
                        .setName('task-id')
                        .setDescription('ID of the task')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign the task to')
                )
                .addBooleanOption(option =>
                    option
                        .setName('unassign')
                        .setDescription('Remove current assignment')
                )
        ) as SlashCommandBuilder,

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = handlers[subcommand as keyof typeof handlers];
            
            if (!handler) {
                await interaction.editReply({
                    content: '❌ Invalid command'
                });
                return;
            }

            await handler.execute(interaction);
        } catch (error) {
            console.error('Error executing tasks command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the command'
            });
        }
    }
};