import { ChatInputCommandInteraction, User } from 'discord.js';
import { StatsCommandHandler, UserMetrics } from '../types.js';
import { createUserMetricsEmbed, formatError } from '../utils.js';

export class UserHandler implements StatsCommandHandler {
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server'
        });
        return;
      }

      // Get target user (or self)
      const target = interaction.options.getUser('target') || interaction.user;
      
      // Get and display stats
      const metrics = await this.getUserMetrics(target, interaction.guild.id);
      const embed = createUserMetricsEmbed(metrics, target.tag);
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to fetch user statistics: ${formatError(error)}`
      });
    }
  }

  private async getUserMetrics(user: User, guildId: string): Promise<UserMetrics> {
    // TODO: Implement actual metrics gathering
    return {
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksAssigned: 0,
      completionRate: 0,
      averageTaskTime: 0,
      lastActive: new Date()
    };
  }
}

export const handler = new UserHandler();