import { ChatInputCommandInteraction } from 'discord.js';
import { createRoleRepository, createUserRoleRepository } from 'database';
import { startRoleInitialization, finishRoleInitialization } from '../../../events/roleEvents.js';
import { RoleCommandHandler } from '../types.js';

const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

export class DeleteHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
    }
}