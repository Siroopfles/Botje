import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { PermissionService } from 'shared';
import type { Permission } from 'shared';
import { StatsCommandHandler, PermissionMetrics } from '../types.js';
import { createPermissionMetricsEmbed, formatError } from '../utils.js';

export class PermissionHandler implements StatsCommandHandler {
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server'
        });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
        await interaction.editReply({
          content: '❌ You need the Manage Server permission to view permission statistics'
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand(false);

      if (subcommand === 'reset') {
        await this.handleReset(interaction);
        return;
      }

      // Get and display stats
      const metrics = await this.getPermissionMetrics(interaction.guild.id);
      const embed = createPermissionMetricsEmbed(metrics);
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to fetch permission statistics: ${formatError(error)}`
      });
    }
  }

  private async handleReset(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Reset the permission cache
      PermissionService.clearAllCache();
      await interaction.editReply({
        content: '✅ Permission metrics have been reset'
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to reset permission metrics: ${formatError(error)}`
      });
    }
  }

  private async getPermissionMetrics(guildId: string): Promise<PermissionMetrics> {
    // Get stats from the permission service
    const serviceStats = PermissionService.getStats();
    const { metrics, cache } = serviceStats;
    const distribution = metrics.permissionDistribution;

    // Calculate user counts
    const totalUsers = cache.roleEntries;
    const managerCount = Math.floor(totalUsers * (this.getPermissionRate(distribution, 'manage')));
    const viewerCount = Math.floor(totalUsers * (this.getPermissionRate(distribution, 'view')));

    // Calculate average permissions per user
    const permissionRates = Object.values(distribution);
    const totalPermissionRate = permissionRates.reduce((sum, rate) => sum + rate, 0);
    const averagePermissions = permissionRates.length > 0 
      ? totalPermissionRate / permissionRates.length 
      : 0;

    // Format permission distribution for display
    const permissionDistribution = Object.entries(distribution)
      .reduce((acc, [perm, rate]) => ({
        ...acc,
        [this.formatPermissionName(perm)]: rate
      }), {});

    return {
      userCount: totalUsers,
      managerCount,
      viewerCount,
      averagePermissions,
      permissionDistribution
    };
  }

  private getPermissionRate(distribution: Record<Permission, number>, type: string): number {
    // Find all permissions of the given type
    return Object.entries(distribution)
      .filter(([key]) => key.toLowerCase().includes(type))
      .reduce((sum, [_, rate]) => sum + rate, 0);
  }

  private formatPermissionName(permission: string): string {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

export const handler = new PermissionHandler();