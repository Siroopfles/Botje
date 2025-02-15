import { ChatInputCommandInteraction } from 'discord.js';
import { TaskStatus } from 'shared';
import { TaskCommandHandler } from '../types.js';
import { taskRepo, formatSuccess, formatError } from '../utils.js';

export class CompleteHandler implements TaskCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const taskId = interaction.options.getString('task-id', true);
        const uncomplete = interaction.options.getBoolean('uncomplete') ?? false;

        try {
            // Verify task exists and belongs to this server
            const task = await taskRepo.findById(taskId);
            if (!task) {
                await interaction.editReply(formatError(new Error('Task not found')));
                return;
            }

            if (task.serverId !== interaction.guildId) {
                await interaction.editReply(formatError(new Error('Task belongs to a different server')));
                return;
            }

            // Handle uncomplete option
            const newStatus = uncomplete ? TaskStatus.PENDING : TaskStatus.COMPLETED;
            const completedDate = uncomplete ? undefined : new Date();

            // Update the task
            const updatedTask = await taskRepo.update(taskId, {
                status: newStatus,
                completedDate
            });

            if (!updatedTask) {
                await interaction.editReply(formatError(new Error('Failed to update task status')));
                return;
            }

            const action = uncomplete ? 'uncompleted' : 'completed';
            await interaction.editReply(formatSuccess(
                `Task "${updatedTask.title}" has been marked as ${action}`
            ));

        } catch (error) {
            console.error('Error completing task:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}