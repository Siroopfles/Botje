import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Permission, PermissionService } from 'shared';
import { Command } from '../../types/command.js';

export const permissionStats: Command = {
    data: new SlashCommandBuilder()
        .setName('permissionstats')
        .setDescription('View permission system statistics and metrics')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current permission system metrics')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset permission metrics (does not affect permissions)')
        ),

    execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'reset') {
            PermissionService.clearAllCache();
            await interaction.reply({
                content: '✅ Permission metrics have been reset.',
                ephemeral: true
            });
            return;
        }

        const stats = PermissionService.getStats();
        const { metrics, cache } = stats;

        // Format cache stats
        const cacheStats = `**Cache Stats:**
• Role Entries: ${cache.roleEntries}
• Permission Entries: ${cache.permissionEntries}`;

        // Format metrics
        const metricStats = `**Permission Metrics (Last 5 Minutes):**
• Total Checks: ${metrics.totalChecks}
• Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%
• Average Check Duration: ${metrics.averageCheckDuration.toFixed(2)}ms
• Checks Per Minute: ${metrics.checksPerMinute.toFixed(1)}
• Grant Rate: ${(metrics.grantRate * 100).toFixed(1)}%`;

        // Format permission distribution
        const permissionDist = Object.entries(metrics.permissionDistribution)
            .sort(([, a], [, b]) => b - a) // Sort by frequency
            .slice(0, 5) // Top 5 most checked permissions
            .map(([perm, count]) => `• ${perm}: ${count} checks`)
            .join('\n');

        const permissionStats = `**Top 5 Checked Permissions:**
${permissionDist}`;

        await interaction.reply({
            embeds: [{
                title: '📊 Permission System Statistics',
                description: `${cacheStats}\n\n${metricStats}\n\n${permissionStats}`,
                color: 0x00ff00,
                footer: {
                    text: 'Stats are from the last 5 minutes of activity'
                },
                timestamp: new Date().toISOString()
            }],
            ephemeral: true
        });
    }
};