import { ChatInputCommandInteraction } from 'discord.js';
import { TaskCommandHandler } from '../types.js';
import { taskRepo, formatSuccess, formatError } from '../utils.js';

export class AssignHandler implements TaskCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const taskId = interaction.options.getString('task-id', true);
        const assignee = interaction.options.getUser('assignee');
        const unassign = interaction.options.getBoolean('unassign') ?? false;

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

            // Cannot assign and unassign at the same time
            if (assignee && unassign) {
                await interaction.editReply(formatError(
                    new Error('Cannot provide both assignee and unassign flag')
                ));
                return;
            }

            // Update task assignment
            const updatedTask = await taskRepo.update(taskId, {
                assigneeId: unassign ? undefined : assignee?.id
            });

            if (!updatedTask) {
                await interaction.editReply(formatError(new Error('Failed to update task assignment')));
                return;
            }

            let message: string;
            if (unassign) {
                message = `Task "${updatedTask.title}" has been unassigned`;
            } else if (assignee) {
                message = `Task "${updatedTask.title}" has been assigned to ${assignee.tag}`;
            } else {
                message = `Task "${updatedTask.title}" assignment has been updated`;
            }

            await interaction.editReply(formatSuccess(message));
        } catch (error) {
            console.error('Error assigning task:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}