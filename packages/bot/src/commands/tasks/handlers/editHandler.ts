import { ChatInputCommandInteraction } from 'discord.js';
import { TaskStatus, RecurrenceType } from 'shared';
import { TaskCommandHandler, TaskEditData } from '../types.js';
import { updateTask, taskRepo, formatSuccess, formatError } from '../utils.js';

export class EditHandler implements TaskCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const taskId = interaction.options.getString('task-id', true);
        const title = interaction.options.getString('title') || undefined;
        const description = interaction.options.getString('description') || undefined;
        const assignee = interaction.options.getUser('assignee');
        const dueDate = interaction.options.getString('due-date') || undefined;
        const status = interaction.options.getString('status') as TaskStatus | undefined;
        const recurring = interaction.options.getBoolean('recurring') ?? false;

        try {
            // Verify task exists and belongs to this server
            const existingTask = await taskRepo.findById(taskId);
            if (!existingTask) {
                await interaction.editReply(formatError(new Error('Task not found')));
                return;
            }

            if (existingTask.serverId !== interaction.guildId) {
                await interaction.editReply(formatError(new Error('Task belongs to a different server')));
                return;
            }

            const taskData: TaskEditData = {};

            // Only include fields that were provided
            if (title) taskData.title = title;
            if (description !== undefined) taskData.description = description;
            if (assignee) taskData.assigneeId = assignee.id;
            if (status) taskData.status = status;

            // Handle due date
            if (dueDate === '') {
                taskData.dueDate = undefined; // Remove due date
            } else if (dueDate) {
                const date = new Date(dueDate);
                if (isNaN(date.getTime())) {
                    await interaction.editReply(formatError(new Error('Invalid due date format. Please use YYYY-MM-DD or YYYY-MM-DD HH:MM')));
                    return;
                }
                taskData.dueDate = date;
            }

            // Handle recurrence
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
            } else if (recurring === false) {
                taskData.recurrence = undefined; // Remove recurrence
            }

            const updatedTask = await updateTask(taskId, taskData);
            if (!updatedTask) {
                await interaction.editReply(formatError(new Error('Failed to update task')));
                return;
            }

            const assignedTo = updatedTask.assigneeId ? 
                ` (Assigned to: ${(await interaction.guild!.members.fetch(updatedTask.assigneeId)).user.tag})` : '';

            await interaction.editReply(formatSuccess(
                `Updated task "${updatedTask.title}"${assignedTo}`
            ));
        } catch (error) {
            console.error('Error updating task:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}