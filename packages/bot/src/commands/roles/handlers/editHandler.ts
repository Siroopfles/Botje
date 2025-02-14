import { ChatInputCommandInteraction } from 'discord.js';
import { Permission } from 'shared';
import { createRoleRepository } from 'database';
import { RoleCommandHandler } from '../types.js';

const roleRepo = createRoleRepository();

export class EditHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
    }
}