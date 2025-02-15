import { ChatInputCommandInteraction } from 'discord.js';
import { UserSettingsCommandHandler } from '../types.js';
import { getUserPreferences, createPreferencesEmbed, formatError } from '../utils.js';

export class ViewHandler implements UserSettingsCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const preferences = await getUserPreferences(interaction.user.id, interaction.guildId!);
            
            if (!preferences) {
                // Show default preferences if none are set
                const defaultPrefs = {
                    notificationSettings: {
                        taskAssigned: true,
                        taskDue: true,
                        taskCompleted: true,
                        dailyDigest: true,
                        digestTime: '09:00'
                    }
                };

                await interaction.editReply({
                    content: '📝 Using default settings:',
                    embeds: [createPreferencesEmbed(defaultPrefs)]
                });
                return;
            }

            await interaction.editReply({
                content: '📝 Your current settings:',
                embeds: [createPreferencesEmbed(preferences)]
            });
        } catch (error) {
            console.error('Error viewing preferences:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}