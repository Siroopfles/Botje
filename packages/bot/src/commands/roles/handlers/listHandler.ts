import { ChatInputCommandInteraction } from 'discord.js';
import { createRoleRepository } from 'database';
import { RoleCommandHandler } from '../types.js';

const roleRepo = createRoleRepository();

export class ListHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
    }
}