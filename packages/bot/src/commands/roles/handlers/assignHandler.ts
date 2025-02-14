import { ChatInputCommandInteraction } from 'discord.js';
import { createRoleRepository, createUserRoleRepository } from 'database';
import { RoleCommandHandler } from '../types.js';

const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

export class AssignHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
    }
}