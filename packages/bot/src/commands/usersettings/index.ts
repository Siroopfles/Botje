import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/command.js';
import { handlers } from './handlers/index.js';

export const usersettings: Command = {
    data: new SlashCommandBuilder()
        .setName('usersettings')
        .setDescription('Configure your personal settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('notifications')
                .setDescription('Configure your notification preferences')
                .addBooleanOption(option =>
                    option
                        .setName('task-assigned')
                        .setDescription('Receive notifications when tasks are assigned to you')
                )
                .addBooleanOption(option =>
                    option
                        .setName('task-due')
                        .setDescription('Receive notifications when your tasks are due')
                )
                .addBooleanOption(option =>
                    option
                        .setName('task-completed')
                        .setDescription('Receive notifications when your tasks are completed')
                )
                .addBooleanOption(option =>
                    option
                        .setName('daily-digest')
                        .setDescription('Receive a daily summary of your tasks')
                )
                .addStringOption(option =>
                    option
                        .setName('digest-time')
                        .setDescription('Time to receive daily digest (24-hour format, e.g. 09:00)')
                )
        ) as SlashCommandBuilder,

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
            console.error('Error executing usersettings command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the command'
            });
        }
    }
};