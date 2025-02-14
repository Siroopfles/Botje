import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/command.js';
import { handlers } from './handlers/index.js';

export const stats: Command = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View system statistics')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group
                .setName('permission')
                .setDescription('Permission system statistics')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('view')
                        .setDescription('View current permission system metrics')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reset')
                        .setDescription('Reset permission metrics (does not affect permissions)')
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const group = interaction.options.getSubcommandGroup();
            const handler = handlers[group as keyof typeof handlers];
            
            if (!handler) {
                await interaction.editReply({
                    content: '❌ Invalid command'
                });
                return;
            }

            await handler.execute(interaction);
        } catch (error) {
            console.error('Error executing stats command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the command'
            });
        }
    }
};