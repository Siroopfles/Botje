import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command.js';
import { 
    createTaskRepository, 
    createNotificationRepository,
    createNotificationPreferencesRepository
} from 'database';
import { TaskStatus, NotificationService, NotificationScheduler } from 'shared';

const taskRepository = createTaskRepository();
const notificationRepository = createNotificationRepository();
const preferencesRepository = createNotificationPreferencesRepository();

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('testnotification')
        .setDescription('Create a test task with due date for notification testing')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('Minutes until task is due (default: 1)')
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('daily_digest')
                .setDescription('Test daily digest notification')
                .setRequired(false)
        ) as SlashCommandBuilder,

    async execute(interaction) {
        const { options, user, guildId } = interaction;
        
        if (!guildId) {
            await interaction.reply({
                content: 'This command can only be used in a server.',
                ephemeral: true
            });
            return;
        }

        const minutes = options.getInteger('minutes') || 1;
        const testDailyDigest = options.getBoolean('daily_digest') || false;

        const dueDate = new Date();
        if (testDailyDigest) {
            // Set due date to today at 23:59 for daily digest testing
            dueDate.setHours(23, 59, 0, 0);
        } else {
            // Set due date to X minutes from now
            dueDate.setMinutes(dueDate.getMinutes() + minutes);
        }

        try {
            // Create test task
            const task = await taskRepository.create({
                title: 'Test Notification Task',
                description: 'This is a test task for notification system',
                status: TaskStatus.PENDING,
                dueDate,
                assigneeId: user.id,
                serverId: guildId
            });

            // Get user preferences
            let preferences = await preferencesRepository.findByUserId(user.id, guildId);
            if (!preferences) {
                preferences = await preferencesRepository.create(
                    NotificationService.createDefaultPreferences(user.id, guildId)
                );
            }

            // Create scheduled notifications
            const scheduledNotifications = NotificationScheduler.scheduleNotifications(task, preferences);
            
            // Save notifications to database
            for (const scheduled of scheduledNotifications) {
                await notificationRepository.create({
                    ...scheduled.notification,
                    scheduledFor: scheduled.notification.scheduledFor
                });
            }

            const response = [
                '✅ Created test notification task:',
                `- Title: ${task.title}`,
                `- Due: ${dueDate.toLocaleString()}`,
                `- Type: ${testDailyDigest ? 'Daily Digest Test' : 'Due Date Notification Test'}`,
                '',
                'Notifications created:',
                `- Total notifications: ${scheduledNotifications.length}`,
                `- Scheduled for: ${scheduledNotifications.map(n => 
                    n.notification.scheduledFor.toLocaleString()).join(', ')}`,
                '',
                'You should receive notifications at the scheduled times.'
            ].join('\n');

            await interaction.reply({
                content: response,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating test task:', error);
            await interaction.reply({
                content: 'Failed to create test task.',
                ephemeral: true
            });
        }
    }
};

export default command;