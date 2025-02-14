import { ChannelType, ChatInputCommandInteraction } from 'discord.js';
import { createServerSettingsRepository, ServerSettingsRepository } from 'database';
import { SettingsCommandHandler } from '../types.js';

const repository: ServerSettingsRepository = createServerSettingsRepository();

export class NotificationsHandler implements SettingsCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const { guildId } = interaction;
        
        if (!guildId) {
            await interaction.editReply({
                content: 'This command can only be used in a server.'
            });
            return;
        }

        const channel = interaction.options.getChannel('channel', true);
        
        try {
            // Get or create server settings
            let settings = await repository.findByServerId(guildId);
            
            if (!settings) {
                settings = await repository.create({
                    serverId: guildId,
                    notificationChannelId: channel.id
                });
            } else {
                settings = await repository.update(guildId, {
                    notificationChannelId: channel.id
                });
            }

            if (!settings) {
                await interaction.editReply({
                    content: '❌ Failed to update server settings.'
                });
                return;
            }

            await interaction.editReply({
                content: `✅ Server notifications will be sent to ${channel}.\nSettings have been saved successfully!`
            });

        } catch (error) {
            console.error('Error updating server settings:', error);
            await interaction.editReply({
                content: '❌ An error occurred while updating server settings.'
            });
        }
    }
}