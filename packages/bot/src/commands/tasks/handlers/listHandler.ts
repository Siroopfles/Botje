import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TaskStatus } from 'shared';
import { TaskCommandHandler, TaskListOptions } from '../types.js';
import { findUserTasks, formatTaskList, createTaskEmbed, formatError } from '../utils.js';

export class ListHandler implements TaskCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const view = interaction.options.getString('view') || 'list';
        const assignee = interaction.options.getUser('assignee');
        const status = interaction.options.getString('status') as TaskStatus | null;
        const overdue = interaction.options.getBoolean('overdue') ?? false;

        try {
            const options: TaskListOptions = {
                assigneeId: assignee?.id,
                status: status || undefined,
                includeOverdue: overdue
            };

            const tasks = await findUserTasks(interaction.guildId!, options);

            if (view === 'detailed' && tasks.length > 0) {
                // Create an embed for each task (up to 10)
                const embeds: EmbedBuilder[] = await Promise.all(
                    tasks.slice(0, 10).map(async task => {
                        if (task.assigneeId) {
                            const assignee = await interaction.guild!.members.fetch(task.assigneeId);
                            return createTaskEmbed(task, assignee.user);
                        }
                        return createTaskEmbed(task);
                    })
                );

                const moreTasksNote = tasks.length > 10 ? 
                    `\n*Showing 10 out of ${tasks.length} tasks. Use \`/tasks list view:list\` to see all.*` : '';

                await interaction.editReply({
                    content: `📋 Task Details${moreTasksNote}`,
                    embeds
                });
            } else {
                // Show simple list view
                const statusFilter = status ? `(${status})` : '';
                const assigneeFilter = assignee ? `for ${assignee.tag}` : '';
                const overdueFilter = overdue ? '(overdue)' : '';
                const filters = [statusFilter, assigneeFilter, overdueFilter].filter(f => f).join(' ');

                await interaction.editReply({
                    content: `📋 Tasks ${filters}\n\n${formatTaskList(tasks)}`
                });
            }
        } catch (error) {
            console.error('Error listing tasks:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}