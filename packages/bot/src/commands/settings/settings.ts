import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command.js';
import { 
    createServerSettingsRepository,
    ServerSettingsRepository 
} from 'database';

const repository: ServerSettingsRepository = createServerSettingsRepository();

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure server settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('notifications')
                .setDescription('Configure server notification settings')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to send notifications to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const { options, guildId } = interaction;
        
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true
            });
            return;
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'notifications') {
            const channel = options.getChannel('channel', true);
            
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
                    await interaction.reply({
                        content: '❌ Failed to update server settings.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.reply({
                    content: `✅ Server notifications will be sent to ${channel}.\nSettings have been saved successfully!`,
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error updating server settings:', error);
                await interaction.reply({
                    content: '❌ An error occurred while updating server settings.',
                    ephemeral: true
                });
            }
        }
    }
};

export default command;