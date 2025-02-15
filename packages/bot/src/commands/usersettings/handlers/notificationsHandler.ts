import { ChatInputCommandInteraction } from 'discord.js';
import { UserSettingsCommandHandler, NotificationPreferencesData } from '../types.js';
import { updateNotificationPreferences, parseTimeString, formatError, formatSuccess } from '../utils.js';

export class NotificationsHandler implements UserSettingsCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const taskAssigned = interaction.options.getBoolean('task-assigned') ?? undefined;
        const taskDue = interaction.options.getBoolean('task-due') ?? undefined;
        const taskCompleted = interaction.options.getBoolean('task-completed') ?? undefined;
        const dailyDigest = interaction.options.getBoolean('daily-digest') ?? undefined;
        const digestTime = interaction.options.getString('digest-time') ?? undefined;

        try {
            // Validate digest time format if provided
            if (digestTime) {
                const parsedTime = parseTimeString(digestTime);
                if (!parsedTime) {
                    await interaction.editReply(formatError(
                        new Error('Invalid time format. Please use HH:MM (24-hour format)')
                    ));
                    return;
                }
            }

            // Only include fields that were provided in the command
            const updateData: NotificationPreferencesData = {
                userId: interaction.user.id,
                serverId: interaction.guildId!
            };

            if (taskAssigned !== undefined) updateData.enableTaskAssigned = taskAssigned;
            if (taskDue !== undefined) updateData.enableTaskDue = taskDue;
            if (taskCompleted !== undefined) updateData.enableTaskCompleted = taskCompleted;
            if (dailyDigest !== undefined) updateData.enableDailyDigest = dailyDigest;
            if (digestTime !== undefined) updateData.digestTime = digestTime;

            // Update preferences
            const result = await updateNotificationPreferences(updateData);

            if (!result.success) {
                throw result.error || new Error(result.message);
            }

            await interaction.editReply(formatSuccess(result.message));
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}