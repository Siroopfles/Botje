import { ChatInputCommandInteraction } from 'discord.js';

export interface SettingsCommandHandler {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface SettingsHandlers {
    notifications: SettingsCommandHandler;
    // Add more settings handlers here as needed
}

export interface NotificationSettings {
    channelId: string;
    serverId: string;
}