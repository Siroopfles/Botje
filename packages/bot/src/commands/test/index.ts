import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command.js';
import { handlers } from './handlers/index.js';

export const test: Command = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test various system components')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group
                .setName('notification')
                .setDescription('Test notification system')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('assignment')
                        .setDescription('Test task assignment notification')
                        .addUserOption(option =>
                            option
                                .setName('assignee')
                                .setDescription('User to assign task to')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('due')
                        .setDescription('Test due date notification')
                        .addUserOption(option =>
                            option
                                .setName('assignee')
                                .setDescription('User to assign task to')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('minutes')
                                .setDescription('Minutes until due')
                                .setRequired(false)
                                .setMinValue(1)
                                .setMaxValue(60)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('overdue')
                        .setDescription('Test overdue notification')
                        .addUserOption(option =>
                            option
                                .setName('assignee')
                                .setDescription('User to assign task to')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('complete')
                        .setDescription('Test completion notification')
                        .addUserOption(option =>
                            option
                                .setName('assignee')
                                .setDescription('User to assign task to')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('daily')
                        .setDescription('Test daily digest')
                        .addUserOption(option =>
                            option
                                .setName('assignee')
                                .setDescription('User to test digest for')
                                .setRequired(true)
                        )
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
            console.error('Error executing test command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the command'
            });
        }
    }
};
