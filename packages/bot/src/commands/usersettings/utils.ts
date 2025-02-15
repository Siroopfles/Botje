import { EmbedBuilder } from 'discord.js';
import { createNotificationPreferencesRepository } from 'database';
import { NotificationService } from 'shared';
import { NotificationPreferencesData, PreferencesUpdateResult, PreferencesViewData } from './types.js';

const preferencesRepo = createNotificationPreferencesRepository();

export function parseTimeString(timeStr: string): Date | null {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || 
        hours < 0 || hours > 23 || 
        minutes < 0 || minutes > 59) {
        return null;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

export function formatTimeString(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export async function getUserPreferences(userId: string, serverId: string): Promise<PreferencesViewData | null> {
    const prefs = await preferencesRepo.findByUserId(userId, serverId);
    
    if (!prefs) return null;

    return {
        notificationSettings: {
            taskAssigned: prefs.notifyOnAssignment,
            taskDue: prefs.notifyOnDue,
            taskCompleted: prefs.notifyOnCompletion,
            dailyDigest: prefs.dailyDigest,
            digestTime: prefs.digestTime
        }
    };
}

export async function updateNotificationPreferences(
    data: NotificationPreferencesData
): Promise<PreferencesUpdateResult> {
    try {
        let prefs = await preferencesRepo.findByUserId(data.userId, data.serverId);

        const baseData = {
            userId: data.userId,
            serverId: data.serverId,
            discordDm: true,
            reminderHours: 24,
            dailyDigest: true,
            notifyOnAssignment: true,
            notifyOnCompletion: true,
            notifyOnDue: true,
            notifyOnOverdue: true
        };

        const updateData = {
            ...baseData,
            notifyOnAssignment: data.enableTaskAssigned ?? baseData.notifyOnAssignment,
            notifyOnDue: data.enableTaskDue ?? baseData.notifyOnDue,
            notifyOnCompletion: data.enableTaskCompleted ?? baseData.notifyOnCompletion,
            dailyDigest: data.enableDailyDigest ?? baseData.dailyDigest,
            digestTime: data.digestTime
        };

        if (!prefs) {
            // Create new preferences
            prefs = await preferencesRepo.create(updateData);
        } else {
            // Update existing preferences
            prefs = await preferencesRepo.update(data.userId, data.serverId, updateData);
        }

        if (!prefs) {
            return {
                success: false,
                message: 'Failed to update preferences',
                error: new Error('Update operation returned null')
            };
        }

        return {
            success: true,
            message: 'Preferences updated successfully'
        };
    } catch (error) {
        return {
            success: false,
            message: 'Failed to update preferences',
            error: error instanceof Error ? error : new Error('Unknown error')
        };
    }
}

export function createPreferencesEmbed(data: PreferencesViewData): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle('🔧 User Settings')
        .setDescription('Your current notification preferences')
        .addFields([
            {
                name: 'Task Notifications',
                value: `
• Task Assigned: ${data.notificationSettings.taskAssigned ? '✅' : '❌'}
• Task Due: ${data.notificationSettings.taskDue ? '✅' : '❌'}
• Task Completed: ${data.notificationSettings.taskCompleted ? '✅' : '❌'}
                `.trim(),
                inline: true
            },
            {
                name: 'Daily Digest',
                value: `
• Enabled: ${data.notificationSettings.dailyDigest ? '✅' : '❌'}
${data.notificationSettings.digestTime ? `• Time: ${data.notificationSettings.digestTime}` : ''}
                `.trim(),
                inline: true
            }
        ]);

    return embed;
}

export function formatError(error: Error): string {
    return `❌ Error: ${error.message}`;
}

export function formatSuccess(message: string): string {
    return `✅ ${message}`;
}

// Export for use in handlers
export { preferencesRepo };