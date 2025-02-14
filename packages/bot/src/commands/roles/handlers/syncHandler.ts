import { ChatInputCommandInteraction, GuildMember, Collection, Role as DiscordRole, GuildMemberManager } from 'discord.js';
import { Permission } from 'shared';
import { RoleDocument, createRoleRepository, createUserRoleRepository } from 'database';
import { startRoleInitialization, finishRoleInitialization } from '../../../../events/roleEvents.js';
import { RoleCommandHandler, SyncResult } from '../types.js';
import { formatRoleMessage } from '../utils.js';

const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

export class SyncHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        startRoleInitialization(interaction.guildId!);

        try {
            await interaction.editReply('🔄 Syncing roles and assignments...');
            const result = await this.synchronizeRoles(interaction);
            const message = formatRoleMessage(
                result.syncedRoles,
                result.updatedRoles,
                result.syncedAssignments
            );

            await interaction.editReply({ content: message });
        } finally {
            finishRoleInitialization(interaction.guildId!);
        }
    }

    private async synchronizeRoles(interaction: ChatInputCommandInteraction): Promise<SyncResult> {
        const result: SyncResult = {
            syncedRoles: [],
            updatedRoles: [],
            syncedAssignments: []
        };

        const discordRoles = await interaction.guild!.roles.fetch();
        const discordMembers = await interaction.guild!.members.fetch();

        // Get all roles that aren't managed by Discord and aren't @everyone
        const validRoles = discordRoles.filter(role => 
            !role.managed && role.id !== interaction.guildId
        );

        for (const [_, discordRole] of validRoles) {
            try {
                const dbRole = await this.syncRole(
                    interaction.guildId!,
                    discordRole,
                    result
                );

                if (dbRole) {
                    await this.syncRoleAssignments(
                        interaction.guildId!,
                        discordRole.id,
                        dbRole,
                        discordMembers,
                        result
                    );
                }
            } catch (error) {
                console.error(`Error syncing role ${discordRole.name}:`, error);
            }
        }

        return result;
    }

    private async syncRole(
        serverId: string,
        discordRole: DiscordRole,
        result: SyncResult
    ): Promise<RoleDocument | null> {
        // Try to find existing role by Discord ID first
        let dbRole = await roleRepo.findByDiscordId(serverId, discordRole.id);
        
        if (!dbRole) {
            // Try to find by name if not found by Discord ID
            const existingRole = await roleRepo.findByName(serverId, discordRole.name);

            if (existingRole) {
                // Update existing role with Discord ID
                dbRole = await roleRepo.update(existingRole.id, {
                    discordRoleId: discordRole.id
                });
                if (dbRole) {
                    result.updatedRoles.push(dbRole.name);
                }
            } else {
                // Create new role
                dbRole = await roleRepo.create({
                    name: discordRole.name,
                    serverId,
                    permissions: [Permission.VIEW_ALL_TASKS],
                    assignableBy: [Permission.MANAGE_ROLES],
                    discordRoleId: discordRole.id
                });
                result.syncedRoles.push(dbRole.name);
            }
        } else if (dbRole.name !== discordRole.name) {
            // Update name if it changed
            const updatedRole = await roleRepo.update(dbRole.id, {
                name: discordRole.name
            });
            if (updatedRole) {
                result.updatedRoles.push(updatedRole.name);
                dbRole = updatedRole;
            }
        }

        return dbRole;
    }

    private async syncRoleAssignments(
        serverId: string,
        discordRoleId: string,
        dbRole: RoleDocument,
        discordMembers: Collection<string, GuildMember>,
        result: SyncResult
    ): Promise<void> {
        const membersWithRole = discordMembers.filter(member => 
            member.roles.cache.has(discordRoleId)
        );

        for (const [memberId, member] of membersWithRole) {
            try {
                const userRoles = await userRoleRepo.findByRole(dbRole.id);
                const existingAssignment = userRoles.find(ur => ur.userId === memberId);

                if (!existingAssignment) {
                    await userRoleRepo.create({
                        userId: memberId,
                        serverId,
                        roleId: dbRole.id,
                        assignedBy: 'SYNC',
                        assignedAt: new Date()
                    });
                    result.syncedAssignments.push(`${member.user.tag} → ${dbRole.name}`);
                }
            } catch (error) {
                console.error(`Error syncing role assignment for ${member.user.tag}:`, error);
            }
        }
    }
}