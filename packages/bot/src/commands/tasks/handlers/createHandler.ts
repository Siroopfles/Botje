import { ChatInputCommandInteraction } from 'discord.js';
import { TaskStatus, RecurrenceType } from 'shared';
import { TaskCommandHandler, TaskCreateData } from '../types.js';
import { createTask, formatSuccess, formatError } from '../utils.js';

export class CreateHandler implements TaskCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description') || undefined;
        const assignee = interaction.options.getUser('assignee');
        const dueDate = interaction.options.getString('due-date') || undefined;
        const recurring = interaction.options.getBoolean('recurring') ?? false;

        try {
            const taskData: TaskCreateData = {
                title,
                serverId: interaction.guildId!,
                status: TaskStatus.PENDING
            };

            // Add optional fields if they exist
            if (description) taskData.description = description;
            if (assignee) taskData.assigneeId = assignee.id;

            // Parse due date if provided
            if (dueDate) {
                const date = new Date(dueDate);
                if (isNaN(date.getTime())) {
                    await interaction.editReply(formatError(new Error('Invalid due date format. Please use YYYY-MM-DD or YYYY-MM-DD HH:MM')));
                    return;
                }
                taskData.dueDate = date;
            }

            // Handle recurrence if enabled
            if (recurring) {
                const recurrenceType = interaction.options.getString('recurrence-type', true) as RecurrenceType;
                const interval = interaction.options.getInteger('interval') ?? 1;
                const days = interaction.options.getString('days')?.split(',').map(d => parseInt(d.trim(), 10));

                taskData.recurrence = {
                    type: recurrenceType,
                    interval,
                    dayOfWeek: recurrenceType === RecurrenceType.WEEKLY ? days : undefined,
                    dayOfMonth: recurrenceType === RecurrenceType.MONTHLY ? days : undefined
                };
            }

            const task = await createTask(taskData);
            const assignedTo = assignee ? ` and assigned to ${assignee.tag}` : '';

            await interaction.editReply(formatSuccess(
                `Created task "${task.title}" with ID ${task.id}${assignedTo}`
            ));
        } catch (error) {
            console.error('Error creating task:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}