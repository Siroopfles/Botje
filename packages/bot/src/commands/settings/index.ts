import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command.js';
import { handlers } from './handlers/index.js';

export const settings: Command = {
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
        await interaction.deferReply({ ephemeral: true });

        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = handlers[subcommand as keyof typeof handlers];
            
            if (!handler) {
                await interaction.editReply({
                    content: '❌ Invalid command'
                });
                return;
            }

            await handler.execute(interaction);
        } catch (error) {
            console.error('Error executing settings command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the command'
            });
        }
    }
};