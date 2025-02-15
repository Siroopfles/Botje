import { ChatInputCommandInteraction } from 'discord.js';
import { TaskCommandHandler } from '../types.js';
import { taskRepo, formatSuccess, formatError } from '../utils.js';

export class DeleteHandler implements TaskCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const taskId = interaction.options.getString('task-id', true);
        const force = interaction.options.getBoolean('force') ?? false;

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

            // Check if task is completed and force flag is not set
            if (!force && task.completedDate) {
                await interaction.editReply({
                    content: '⚠️ This task is already completed. Use `force: true` if you still want to delete it.'
                });
                return;
            }

            // Delete the task
            const deleted = await taskRepo.delete(taskId);
            if (!deleted) {
                await interaction.editReply(formatError(new Error('Failed to delete task')));
                return;
            }

            await interaction.editReply(formatSuccess(
                `Deleted task "${task.title}" (ID: ${task.id})`
            ));
        } catch (error) {
            console.error('Error deleting task:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}