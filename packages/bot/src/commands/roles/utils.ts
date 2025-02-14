import { Guild } from 'discord.js';
import { Role } from 'shared';

export async function createDiscordRole(guild: Guild, role: Role): Promise<string> {
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

export function formatRoleMessage(
    syncedRoles: string[],
    updatedRoles: string[],
    syncedAssignments: string[]
): string {
    let message = '';
    
    if (syncedRoles.length > 0) {
        message += `✅ Created ${syncedRoles.length} roles:\n${syncedRoles.map(name => `- ${name}`).join('\n')}\n\n`;
    }

    if (updatedRoles.length > 0) {
        message += `✅ Updated ${updatedRoles.length} roles:\n${updatedRoles.map(name => `- ${name}`).join('\n')}\n\n`;
    }
    
    if (syncedAssignments.length > 0) {
        message += `✅ Created ${syncedAssignments.length} role assignments:\n${syncedAssignments.map(a => `- ${a}`).join('\n')}`;
    }

    if (!message) {
        message = '✅ All roles and assignments are already synced';
    }

    return message;
}