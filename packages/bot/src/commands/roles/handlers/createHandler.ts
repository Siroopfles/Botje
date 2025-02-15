import { ChatInputCommandInteraction } from 'discord.js';
import { Permission } from 'shared';
import { createRoleRepository } from 'database';
import { startRoleInitialization, finishRoleInitialization } from '../../../events/roleEvents.js';
import { RoleCommandHandler } from '../types.js';
import { createDiscordRole } from '../utils.js';

const roleRepo = createRoleRepository();

export class CreateHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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

        try {
            startRoleInitialization(interaction.guildId!);

            // Create Discord role first
            const discordRoleId = await createDiscordRole(interaction.guild!, {
                name,
                serverId: interaction.guildId!,
                permissions: permissions as Permission[],
                assignableBy: [Permission.MANAGE_ROLES]
            });

            // Create role in database
            const role = await roleRepo.create({
                name,
                serverId: interaction.guildId!,
                permissions: permissions as Permission[],
                assignableBy: [Permission.MANAGE_ROLES],
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
    }
}