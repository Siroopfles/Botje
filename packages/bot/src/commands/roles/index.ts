import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/command.js';
import { Permission } from 'shared';
import { handlers } from './handlers/index.js';

export const roles: Command = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Manage server roles and permissions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('init')
                .setDescription('Initialize default roles')
                .addBooleanOption(option =>
                    option
                        .setName('force')
                        .setDescription('Delete existing roles and recreate them')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sync')
                .setDescription('Sync Discord roles with database')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all roles')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new role')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name of the role')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('permissions')
                        .setDescription('Comma-separated list of permissions')
                        .addChoices(
                            ...Object.values(Permission).map(perm => ({
                                name: perm,
                                value: perm
                            }))
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a role\'s permissions')
                .addStringOption(option =>
                    option
                        .setName('role-id')
                        .setDescription('ID of the role to edit')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('permissions')
                        .setDescription('New comma-separated list of permissions')
                        .addChoices(
                            ...Object.values(Permission).map(perm => ({
                                name: perm,
                                value: perm
                            }))
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a role')
                .addStringOption(option =>
                    option
                        .setName('role-id')
                        .setDescription('ID of the role to delete')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('assign')
                .setDescription('Assign a role to a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to assign the role to')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('role-id')
                        .setDescription('ID of the role to assign')
                        .setRequired(true)
                )
        ) as SlashCommandBuilder,

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const handler = handlers[subcommand as keyof typeof handlers];
            
            if (!handler) {
                await interaction.editReply('❌ Invalid subcommand');
                return;
            }

            await handler.execute(interaction);
        } catch (error) {
            console.error('Error executing roles command:', error);
            await interaction.editReply('❌ An error occurred while managing roles');
        }
    }
};