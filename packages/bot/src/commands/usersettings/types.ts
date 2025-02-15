import { ChatInputCommandInteraction } from 'discord.js';

export interface UserSettingsCommandHandler {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface UserSettingsHandlers {
    notifications: UserSettingsCommandHandler;
    view: UserSettingsCommandHandler;
}

export interface NotificationPreferencesData {
    userId: string;
    serverId: string;
    enableTaskAssigned?: boolean;
    enableTaskDue?: boolean;
    enableTaskCompleted?: boolean;
    enableDailyDigest?: boolean;
    digestTime?: string; // HH:MM format
}

export interface UserPreferencesData {
    notificationPreferences?: NotificationPreferencesData;
    timezone?: string;
}

export interface PreferencesUpdateResult {
    success: boolean;
    message: string;
    error?: Error;
}

export interface PreferencesViewData {
    notificationSettings: {
        taskAssigned: boolean;
        taskDue: boolean;
        taskCompleted: boolean;
        dailyDigest: boolean;
        digestTime?: string;
    };
    timezone?: string;
}