import { ChatInputCommandInteraction } from 'discord.js';

export interface RoleCommandHandler {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface SyncResult {
    syncedRoles: string[];
    updatedRoles: string[];
    syncedAssignments: string[];
}

export interface RoleHandlers {
    init: RoleCommandHandler;
    sync: RoleCommandHandler;
    list: RoleCommandHandler;
    create: RoleCommandHandler;
    edit: RoleCommandHandler;
    delete: RoleCommandHandler;
    assign: RoleCommandHandler;
}