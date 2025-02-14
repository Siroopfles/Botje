import { SlashCommandBuilder, PermissionFlagsBits, Guild } from 'discord.js';
import { Command } from '../../types/command.js';
import { 
    Permission, 
    createDefaultRoles, 
    Role 
} from 'shared';
import { 
    createRoleRepository,
    createUserRoleRepository
} from 'database';
import { startRoleInitialization, finishRoleInitialization } from '../../events/roleEvents.js';

// Create repositories once
const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

// Helper function to create Discord roles
async function createDiscordRole(guild: Guild, role: Role): Promise<string> {
    try {
        // Create the Discord role
        const discordRole = await guild.roles.create({
            name: role.name,
            color: role.name === 'Admin' ? '#FF0000' : 
                   role.name === 'Moderator' ? '#00FF00' : 
                   '#0000FF',
            reason: 'Bot role initialization'
        });

        return discordRole.id;
    } catch (error) {
        console.error(`Error creating Discord role ${role.name}:`, error);
        throw error;
    }
}

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

            switch (subcommand) {
                case 'init': {
                    const force = interaction.options.getBoolean('force') ?? false;

                    // Start initialization to prevent event handlers from interfering
                    startRoleInitialization(interaction.guildId!);

                    try {
                        // Get current state
                        const dbRoles = await roleRepo.findByServerId(interaction.guildId!);
                        
                        if (force) {
                            await interaction.editReply('🔄 Deleting all roles...');
                            
                            // Delete all roles from database first
                            for (const role of dbRoles) {
                                // Delete user assignments
                                const userRoles = await userRoleRepo.findByRole(role.id);
                                for (const userRole of userRoles) {
                                    await userRoleRepo.delete(userRole.id);
                                }
                                // Delete database role
                                await roleRepo.delete(role.id);
                            }
                        } else if (dbRoles.length > 0) {
                            await interaction.editReply({
                                content: '⚠️ Roles already exist. Use `/roles init force:true` to recreate roles or `/roles list` to see existing roles.'
                            });
                            return;
                        }

                        await interaction.editReply('🔄 Creating default roles...');

                        // Create default roles
                        const defaultRoles = createDefaultRoles(interaction.guildId!);
                        const createdRoles = [];

                        for (const role of defaultRoles) {
                            try {
                                // Create new Discord role
                                const discordRoleId = await createDiscordRole(interaction.guild!, role);
                                
                                // Create database entry
                                const dbRole = await roleRepo.create({
                                    ...role,
                                    discordRoleId
                                });
                                
                                createdRoles.push({
                                    name: dbRole.name,
                                    id: dbRole.id,
                                    discordRoleId
                                });
                            } catch (error) {
                                // Clean up on failure
                                for (const created of createdRoles) {
                                    try {
                                        const discordRole = await interaction.guild!.roles.fetch(created.discordRoleId);
                                        if (discordRole) await discordRole.delete();
                                        await roleRepo.delete(created.id);
                                    } catch (cleanupError) {
                                        console.error('Error during cleanup:', cleanupError);
                                    }
                                }
                                throw error;
                            }
                        }

                        await interaction.editReply({
                            content: `✅ ${force ? 'Recreated' : 'Created'} ${createdRoles.length} default roles:\n${
                                createdRoles.map(role => 
                                    `- ${role.name} (ID: ${role.id})`
                                ).join('\n')
                            }`
                        });
                    } finally {
                        finishRoleInitialization(interaction.guildId!);
                    }
                    break;
                }

                case 'sync': {
                    startRoleInitialization(interaction.guildId!);

                    try {
                        await interaction.editReply('🔄 Syncing roles and assignments...');

                        // Get all Discord roles and members
                        const discordRoles = await interaction.guild!.roles.fetch();
                        const discordMembers = await interaction.guild!.members.fetch();
                        const syncedRoles = [];
                        const syncedAssignments = [];

                        // Get all roles that aren't managed by Discord and aren't @everyone
                        const validRoles = discordRoles.filter(role => 
                            !role.managed && role.id !== interaction.guildId
                        );

                        for (const [_, discordRole] of validRoles) {
                            try {
                                let dbRole = await roleRepo.findByName(interaction.guildId!, discordRole.name);
                                
                                // Create role in database if it doesn't exist
                                if (!dbRole) {
                                    dbRole = await roleRepo.create({
                                        name: discordRole.name,
                                        serverId: interaction.guildId!,
                                        permissions: [Permission.VIEW_ALL_TASKS],
                                        assignableBy: [Permission.MANAGE_ROLES],
                                        discordRoleId: discordRole.id
                                    });
                                    syncedRoles.push(dbRole.name);
                                }

                                // Sync role assignments
                                const membersWithRole = discordMembers.filter(member => 
                                    member.roles.cache.has(discordRole.id)
                                );

                                for (const [memberId, member] of membersWithRole) {
                                    try {
                                        // Check if assignment already exists
                                        const userRoles = await userRoleRepo.findByRole(dbRole.id);
                                        const existingAssignment = userRoles.find(ur => ur.userId === memberId);

                                        if (!existingAssignment) {
                                            await userRoleRepo.create({
                                                userId: memberId,
                                                serverId: interaction.guildId!,
                                                roleId: dbRole.id,
                                                assignedBy: 'SYNC',
                                                assignedAt: new Date()
                                            });
                                            syncedAssignments.push(`${member.user.tag} → ${dbRole.name}`);
                                        }
                                    } catch (error) {
                                        console.error(`Error syncing role assignment for ${member.user.tag}:`, error);
                                    }
                                }
                            } catch (error) {
                                console.error(`Error syncing role ${discordRole.name}:`, error);
                            }
                        }

                        // Prepare response message
                        let message = '';
                        
                        if (syncedRoles.length > 0) {
                            message += `✅ Synced ${syncedRoles.length} roles:\n${syncedRoles.map(name => `- ${name}`).join('\n')}\n\n`;
                        }
                        
                        if (syncedAssignments.length > 0) {
                            message += `✅ Created ${syncedAssignments.length} role assignments:\n${syncedAssignments.map(a => `- ${a}`).join('\n')}`;
                        }

                        if (!message) {
                            message = '✅ All roles and assignments are already synced';
                        }

                        await interaction.editReply({ content: message });
                    } finally {
                        finishRoleInitialization(interaction.guildId!);
                    }
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

                    const newRole: Role = {
                        name,
                        serverId: interaction.guildId!,
                        permissions: permissions as Permission[],
                        assignableBy: [Permission.MANAGE_ROLES]
                    };

                    try {
                        startRoleInitialization(interaction.guildId!);

                        // Create Discord role first
                        const discordRoleId = await createDiscordRole(interaction.guild!, newRole);

                        // Create role in database
                        const role = await roleRepo.create({
                            ...newRole,
                            discordRoleId
                        });

                        await interaction.editReply({
                            content: `✅ Created role "${role.name}" with ID: ${role.id}`
                        });
                    } catch (error) {
                        console.error('Error creating role:', error);
                        await interaction.editReply('❌ Failed to create role. It might already exist.');
                    } finally {
                        finishRoleInitialization(interaction.guildId!);
                    }
                    break;
                }

                case 'edit': {
                    const roleId = interaction.options.getString('role-id', true);
                    const permissionsStr = interaction.options.getString('permissions', true);
                    
                    const role = await roleRepo.findById(roleId);
                    if (!role) {
                        await interaction.editReply('❌ Role not found');
                        return;
                    }

                    if (role.serverId !== interaction.guildId) {
                        await interaction.editReply('❌ This role belongs to a different server');
                        return;
                    }

                    // Validate permissions
                    const permissions = permissionsStr.split(',').map(p => p.trim());
                    const invalidPerms = permissions.filter(p => !Object.values(Permission).includes(p as Permission));
                    
                    if (invalidPerms.length > 0) {
                        await interaction.editReply({
                            content: `❌ Invalid permissions: ${invalidPerms.join(', ')}\nValid permissions: ${Object.values(Permission).join(', ')}`
                        });
                        return;
                    }

                    // Update role permissions
                    try {
                        const updatedRole = await roleRepo.update(roleId, {
                            permissions: permissions as Permission[]
                        });

                        if (!updatedRole) {
                            await interaction.editReply('❌ Failed to update role permissions');
                            return;
                        }

                        await interaction.editReply({
                            content: `✅ Updated permissions for role "${updatedRole.name}"\nNew permissions: ${permissions.join(', ')}`
                        });
                    } catch (error) {
                        console.error('Error updating role:', error);
                        await interaction.editReply('❌ Failed to update role permissions');
                    }
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

                    try {
                        startRoleInitialization(interaction.guildId!);

                        // Delete user role assignments first
                        const userRoles = await userRoleRepo.findByRole(roleId);
                        for (const userRole of userRoles) {
                            await userRoleRepo.delete(userRole.id);
                        }

                        // Delete Discord role if it exists
                        if (role.discordRoleId) {
                            const discordRole = await interaction.guild!.roles.fetch(role.discordRoleId);
                            if (discordRole) {
                                await discordRole.delete('Role deleted through bot command');
                            }
                        }

                        // Delete role from database
                        const deleted = await roleRepo.delete(roleId);
                        if (!deleted) {
                            await interaction.editReply('❌ Failed to delete role');
                            return;
                        }

                        await interaction.editReply(`✅ Deleted role "${role.name}"`);
                    } catch (error) {
                        console.error('Error deleting role:', error);
                        await interaction.editReply('❌ Failed to delete role');
                    } finally {
                        finishRoleInitialization(interaction.guildId!);
                    }
                    break;
                }

                case 'assign': {
                    const user = interaction.options.getUser('user', true);
                    const roleId = interaction.options.getString('role-id', true);

                    try {
                        const role = await roleRepo.findById(roleId);
                        if (!role) {
                            await interaction.editReply('❌ Role not found');
                            return;
                        }

                        if (role.serverId !== interaction.guildId) {
                            await interaction.editReply('❌ This role belongs to a different server');
                            return;
                        }

                        // Assign Discord role if it exists
                        if (role.discordRoleId) {
                            const member = await interaction.guild!.members.fetch(user.id);
                            await member.roles.add(role.discordRoleId);
                        }

                        // Create database assignment
                        await userRoleRepo.create({
                            userId: user.id,
                            serverId: interaction.guildId!,
                            roleId: role.id,
                            assignedBy: interaction.user.id,
                            assignedAt: new Date()
                        });

                        await interaction.editReply(`✅ Assigned role "${role.name}" to ${user.tag}`);
                    } catch (error) {
                        console.error('Error assigning role:', error);
                        await interaction.editReply('❌ Failed to assign role');
                    }
                    break;
                }
            }

        } catch (error) {
            console.error('Error executing roles command:', error);
            await interaction.editReply('❌ An error occurred while managing roles');
        }
    }
};