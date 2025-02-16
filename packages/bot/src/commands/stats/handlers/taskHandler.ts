import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { StatsCommandHandler, TaskMetrics, Period } from '../types.js';
import { createTaskMetricsEmbed, formatError } from '../utils.js';

export class TaskHandler implements StatsCommandHandler {
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server'
        });
        return;
      }

      // Get period from options
      const period = (interaction.options.getString('period') || 'all') as Period;
      
      // Get and display stats
      const metrics = await this.getTaskMetrics(interaction.guild.id, period);
      const embed = createTaskMetricsEmbed(metrics, this.formatPeriod(period));
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to fetch task statistics: ${formatError(error)}`
      });
    }
  }

  private async getTaskMetrics(guildId: string, period: Period): Promise<TaskMetrics> {
    // TODO: Implement actual metrics gathering
    return {
      totalTasks: 0,
      completedTasks: 0,
      averageCompletionTime: 0,
      tasksByStatus: {
        'Pending': 0,
        'In Progress': 0,
        'Completed': 0
      }
    };
  }

  private formatPeriod(period: Period): string {
    switch (period) {
      case 'day':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      default:
        return 'All Time';
    }
  }
}

export const handler = new TaskHandler();