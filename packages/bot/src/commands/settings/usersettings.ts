import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command.js';
import { 
    NotificationPreferences, 
    NotificationService 
} from 'shared';
import { 
    createNotificationPreferencesRepository,
    NotificationPreferencesRepository 
} from 'database';

const repository: NotificationPreferencesRepository = createNotificationPreferencesRepository();

function formatPreferences(preferences: NotificationPreferences): string {
    return [
        '**Current Notification Settings**',
        `- Discord DM: ${preferences.discordDm ? '✅' : '❌'}`,
        `- Reminder Hours: ${preferences.reminderHours}`,
        `- Daily Digest: ${preferences.dailyDigest ? '✅' : '❌'}`,
        `- Digest Time: ${preferences.digestTime || '09:00'}`,
        '',
        '**Notification Types**',
        `- Task Assignment: ${preferences.notifyOnAssignment ? '✅' : '❌'}`,
        `- Task Completion: ${preferences.notifyOnCompletion ? '✅' : '❌'}`,
        `- Task Due: ${preferences.notifyOnDue ? '✅' : '❌'}`,
        `- Task Overdue: ${preferences.notifyOnOverdue ? '✅' : '❌'}`
    ].join('\n');
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('usersettings')
        .setDescription('Manage your user settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('notifications')
                .setDescription('Manage your notification preferences')
                .addBooleanOption(option =>
                    option
                        .setName('discord_dm')
                        .setDescription('Receive notifications via Discord DM')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('reminder_hours')
                        .setDescription('Hours before due date to send reminder')
                        .setMinValue(1)
                        .setMaxValue(72)
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('daily_digest')
                        .setDescription('Receive daily digest of tasks')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('digest_time')
                        .setDescription('Time to receive daily digest (HH:mm)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('notify_assignment')
                        .setDescription('Notify when assigned to tasks')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('notify_completion')
                        .setDescription('Notify when tasks are completed')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('notify_due')
                        .setDescription('Notify when tasks are due')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('notify_overdue')
                        .setDescription('Notify when tasks are overdue')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const { options, user, guildId } = interaction;
        
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true
            });
            return;
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'notifications') {
            // Get existing preferences or create default
            let preferences = await repository.findByUserId(user.id, guildId);
            
            if (!preferences) {
                preferences = await repository.create(
                    NotificationService.createDefaultPreferences(user.id, guildId)
                );
            }

            // Check if any options were provided
            const providedOptions = options.data[0]?.options || [];
            const hasUpdates = providedOptions.length > 0;

            if (!hasUpdates) {
                // Show current settings
                await interaction.reply({
                    content: formatPreferences(preferences),
                    ephemeral: true
                });
                return;
            }

            // Update preferences with provided options
            const updates: Partial<NotificationPreferences> = {};

            // Get and process discord_dm option
            if (options.data[0].options?.some(opt => opt.name === 'discord_dm')) {
                updates.discordDm = options.getBoolean('discord_dm') ?? false;
            }

            // Get and process reminder_hours option
            const reminderHours = options.getInteger('reminder_hours');
            if (reminderHours !== null) {
                updates.reminderHours = reminderHours;
            }

            // Get and process daily_digest option
            if (options.data[0].options?.some(opt => opt.name === 'daily_digest')) {
                updates.dailyDigest = options.getBoolean('daily_digest') ?? false;
            }

            // Get and process digest_time option
            const digestTime = options.getString('digest_time');
            if (digestTime !== null) {
                // Validate time format
                if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(digestTime)) {
                    await interaction.reply({
                        content: 'Invalid time format. Please use HH:mm (e.g., 09:00)',
                        ephemeral: true
                    });
                    return;
                }
                updates.digestTime = digestTime;
            }

            // Get and process notify_assignment option
            if (options.data[0].options?.some(opt => opt.name === 'notify_assignment')) {
                updates.notifyOnAssignment = options.getBoolean('notify_assignment') ?? false;
            }

            // Get and process notify_completion option
            if (options.data[0].options?.some(opt => opt.name === 'notify_completion')) {
                updates.notifyOnCompletion = options.getBoolean('notify_completion') ?? false;
            }

            // Get and process notify_due option
            if (options.data[0].options?.some(opt => opt.name === 'notify_due')) {
                updates.notifyOnDue = options.getBoolean('notify_due') ?? false;
            }

            // Get and process notify_overdue option
            if (options.data[0].options?.some(opt => opt.name === 'notify_overdue')) {
                updates.notifyOnOverdue = options.getBoolean('notify_overdue') ?? false;
            }

            // Update preferences in database
            const updatedPrefs = await repository.update(user.id, guildId, updates);

            if (!updatedPrefs) {
                await interaction.reply({
                    content: '❌ Failed to update notification preferences.',
                    ephemeral: true
                });
                return;
            }

            // Show updated settings
            await interaction.reply({
                content: `✅ Preferences updated successfully!\n\n${formatPreferences(updatedPrefs)}`,
                ephemeral: true
            });
        }
    }
};

export default command;