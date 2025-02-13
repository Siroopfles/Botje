import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/command.js';
import { 
    Permission, 
    createDefaultRoles, 
    Role 
} from 'shared';
import { 
    createRoleRepository,
    createUserRoleRepository,
    connect
} from 'database';

const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

export const roles: Command = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Manage server roles and permissions')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('init')
                .setDescription('Initialize default roles')
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
            // Ensure database connection
            if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
                throw new Error('Database configuration missing');
            }

            await connect({
                uri: process.env.MONGODB_URI,
                dbName: process.env.MONGODB_DB_NAME
            });

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'init': {
                    const defaultRoles = createDefaultRoles(interaction.guildId!);
                    const createdRoles = await Promise.all(
                        defaultRoles.map(role => roleRepo.create(role))
                    );

                    await interaction.editReply({
                        content: `✅ Created ${createdRoles.length} default roles:\n${
                            createdRoles.map(role => 
                                `- ${role.name} (ID: ${role.id})`
                            ).join('\n')
                        }`
                    });
                    break;
                }

                case 'list': {
                    const roles = await roleRepo.findByServerId(interaction.guildId!);
                    if (roles.length === 0) {
                        await interaction.editReply('No roles found. Use `/roles init` to create default roles.');
                        return;
                    }

                    const response = roles.map(role => {
                        const permList = role.permissions.join(', ');
                        return `**${role.name}** (ID: ${role.id})\nPermissions: ${permList}`;
                    }).join('\n\n');

                    await interaction.editReply({
                        content: `📋 Server Roles:\n\n${response}`
                    });
                    break;
                }

                case 'create': {
                    const name = interaction.options.getString('name', true);
                    const permissionsStr = interaction.options.getString('permissions', true);
                    
                    // Validate permissions
                    const permissions = permissionsStr.split(',').map(p => p.trim());
                    const invalidPerms = permissions.filter(p => !Object.values(Permission).includes(p as Permission));
                    
                    if (invalidPerms.length > 0) {
                        await interaction.editReply({
                            content: `❌ Invalid permissions: ${invalidPerms.join(', ')}\nValid permissions: ${Object.values(Permission).join(', ')}`
                        });
                        return;
                    }

                    const role = await roleRepo.create({
                        name,
                        serverId: interaction.guildId!,
                        permissions: permissions as Permission[],
                        assignableBy: [Permission.MANAGE_ROLES]
                    });

                    await interaction.editReply({
                        content: `✅ Created role "${role.name}" with ID: ${role.id}`
                    });
                    break;
                }

                case 'delete': {
                    const roleId = interaction.options.getString('role-id', true);
                    const role = await roleRepo.findById(roleId);

                    if (!role) {
                        await interaction.editReply('❌ Role not found');
                        return;
                    }

                    if (role.serverId !== interaction.guildId) {
                        await interaction.editReply('❌ This role belongs to a different server');
                        return;
                    }

                    const deleted = await roleRepo.delete(roleId);
                    if (!deleted) {
                        await interaction.editReply('❌ Failed to delete role');
                        return;
                    }

                    await interaction.editReply(`✅ Deleted role "${role.name}"`);
                    break;
                }

                case 'assign': {
                    const user = interaction.options.getUser('user', true);
                    const roleId = interaction.options.getString('role-id', true);

                    const role = await roleRepo.findById(roleId);
                    if (!role) {
                        await interaction.editReply('❌ Role not found');
                        return;
                    }

                    if (role.serverId !== interaction.guildId) {
                        await interaction.editReply('❌ This role belongs to a different server');
                        return;
                    }

                    await userRoleRepo.create({
                        userId: user.id,
                        serverId: interaction.guildId!,
                        roleId: role.id,
                        assignedBy: interaction.user.id,
                        assignedAt: new Date()
                    });

                    await interaction.editReply(`✅ Assigned role "${role.name}" to ${user.tag}`);
                    break;
                }
            }

        } catch (error) {
            console.error('Error executing roles command:', error);
            await interaction.editReply('❌ An error occurred while managing roles');
        }
    }
};