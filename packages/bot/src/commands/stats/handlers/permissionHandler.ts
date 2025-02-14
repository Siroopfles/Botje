import { ChatInputCommandInteraction } from 'discord.js';
import { PermissionService } from 'shared';
import { StatsCommandHandler } from '../types.js';
import { createMetricsEmbed, formatError } from '../utils.js';

export class PermissionHandler implements StatsCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'reset') {
                PermissionService.clearAllCache();
                await interaction.editReply({
                    content: '✅ Permission metrics have been reset.',
                });
                return;
            }

            // View stats
            const stats = PermissionService.getStats();
            const embed = createMetricsEmbed(stats);
            
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error showing permission stats:', error);
            await interaction.editReply({
                content: formatError(error instanceof Error ? error : new Error('Unknown error'))
            });
        }
    }
}