import { ChatInputCommandInteraction } from 'discord.js';
import { createDefaultRoles } from 'shared';
import { createRoleRepository, createUserRoleRepository } from 'database';
import { startRoleInitialization, finishRoleInitialization } from '../../../events/roleEvents.js';
import { RoleCommandHandler } from '../types.js';
import { createDiscordRole } from '../utils.js';

const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();

export class InitHandler implements RoleCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const force = interaction.options.getBoolean('force') ?? false;

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
    }
}