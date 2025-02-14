import { Events, GuildMember, Role } from 'discord.js';
import { createRoleRepository, createUserRoleRepository } from 'database';
import { Permission } from 'shared';

// Create repositories once
const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

// Track roles being initialized to prevent duplicate creation
const initializingServers = new Set<string>();

export function startRoleInitialization(serverId: string): void {
    initializingServers.add(serverId);
}

export function finishRoleInitialization(serverId: string): void {
    initializingServers.delete(serverId);
}

/**
 * Handle when a new role is created in Discord
 */
export async function handleRoleCreate(role: Role) {
    try {
        // Skip if server is currently initializing roles
        if (initializingServers.has(role.guild.id)) {
            console.log(`Skipping auto-creation for role ${role.name} during initialization`);
            return;
        }

        // Check if role already exists in database
        const serverRoles = await roleRepo.findByServerId(role.guild.id);
        const existingRole = serverRoles.find(r => r.discordRoleId === role.id);

        if (!existingRole) {
            // Create role in database with default permissions
            await roleRepo.create({
                name: role.name,
                serverId: role.guild.id,
                permissions: [Permission.VIEW_ALL_TASKS], // Default permission
                assignableBy: [Permission.MANAGE_ROLES],
                discordRoleId: role.id
            });
            console.log(`Added new role ${role.name} to database`);
        }
    } catch (error) {
        console.error('Error handling role creation:', error);
    }
}

/**
 * Handle role updates when member roles change
 */
export async function handleGuildMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
    // If roles haven't changed, ignore
    if (oldMember.roles.cache.equals(newMember.roles.cache)) {
        return;
    }

    try {
        // Get all roles for this server from our database
        const serverRoles = await roleRepo.findByServerId(newMember.guild.id);
        const roleMap = new Map(serverRoles.map(role => [role.discordRoleId!, role.id]));

        // Find added roles
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        for (const [discordRoleId, role] of addedRoles) {
            const dbRoleId = roleMap.get(discordRoleId);
            if (dbRoleId) {
                try {
                    await userRoleRepo.create({
                        userId: newMember.id,
                        serverId: newMember.guild.id,
                        roleId: dbRoleId,
                        assignedBy: 'DISCORD', // Indicate this was assigned through Discord
                        assignedAt: new Date()
                    });
                } catch (error) {
                    console.error(`Error syncing added role ${role.name}:`, error);
                }
            } else {
                // If the role doesn't exist in our database, create it
                try {
                    const newDbRole = await roleRepo.create({
                        name: role.name,
                        serverId: newMember.guild.id,
                        permissions: [Permission.VIEW_ALL_TASKS], // Default permission
                        assignableBy: [Permission.MANAGE_ROLES],
                        discordRoleId: role.id
                    });

                    // Now create the user assignment
                    await userRoleRepo.create({
                        userId: newMember.id,
                        serverId: newMember.guild.id,
                        roleId: newDbRole.id,
                        assignedBy: 'DISCORD',
                        assignedAt: new Date()
                    });
                } catch (error) {
                    console.error(`Error creating new role ${role.name}:`, error);
                }
            }
        }

        // Find removed roles
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
        for (const [discordRoleId] of removedRoles) {
            const dbRoleId = roleMap.get(discordRoleId);
            if (dbRoleId) {
                try {
                    await userRoleRepo.deleteByUserAndRole(newMember.id, dbRoleId);
                } catch (error) {
                    console.error(`Error syncing removed role ${discordRoleId}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error handling role update:', error);
    }
}

/**
 * Handle role deletion in Discord
 */
export async function handleRoleDelete(role: Role) {
    try {
        // Skip if server is currently initializing roles
        if (initializingServers.has(role.guild.id)) {
            console.log(`Skipping deletion handling for role ${role.name} during initialization`);
            return;
        }

        // Find the role in our database by Discord ID
        const serverRoles = await roleRepo.findByServerId(role.guild.id);
        const dbRole = serverRoles.find(r => r.discordRoleId === role.id);

        if (dbRole) {
            // Delete all user assignments for this role
            const userRoles = await userRoleRepo.findByRole(dbRole.id);
            for (const userRole of userRoles) {
                await userRoleRepo.deleteByUserAndRole(userRole.userId, dbRole.id);
            }

            // Delete the role itself from our database
            await roleRepo.delete(dbRole.id);
            console.log(`Deleted role ${dbRole.name} and its assignments from database`);
        }
    } catch (error) {
        console.error('Error handling role deletion:', error);
    }
}

export const roleEvents = {
    [Events.GuildRoleCreate]: handleRoleCreate,
    [Events.GuildMemberUpdate]: handleGuildMemberUpdate,
    [Events.GuildRoleDelete]: handleRoleDelete
};