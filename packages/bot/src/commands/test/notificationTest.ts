import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types/command.js';
import { 
    createTaskRepository, 
    createNotificationRepository,
    createNotificationPreferencesRepository
} from 'database';
import { TaskStatus, NotificationService } from 'shared';

const taskRepository = createTaskRepository();
const notificationRepository = createNotificationRepository();
const preferencesRepository = createNotificationPreferencesRepository();

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('testnotification')
        .setDescription('Test notification system with different scenarios')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('assignment')
                .setDescription('Test task assignment notification')
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign task to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('due')
                .setDescription('Test due date notification')
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign task to')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('minutes')
                        .setDescription('Minutes until due')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(60)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('overdue')
                .setDescription('Test overdue notification')
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign task to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('complete')
                .setDescription('Test completion notification')
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to assign task to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Test daily digest')
                .addUserOption(option =>
                    option
                        .setName('assignee')
                        .setDescription('User to test digest for')
                        .setRequired(true)
                )
        ) as SlashCommandBuilder,

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const { options, guildId } = interaction;
        if (!guildId) {
            await interaction.editReply('This command can only be used in a server.');
            return;
        }

        const subcommand = options.getSubcommand();
        const assignee = options.getUser('assignee', true);

        try {
            // Get or create user preferences
            let preferences = await preferencesRepository.findByUserId(assignee.id, guildId);
            if (!preferences) {
                preferences = await preferencesRepository.create(
                    NotificationService.createDefaultPreferences(assignee.id, guildId)
                );
            }

            switch (subcommand) {
                case 'assignment': {
                    const task = await taskRepository.create({
                        title: 'Test Assignment Notification',
                        description: 'Testing assignment notification format',
                        status: TaskStatus.PENDING,
                        assigneeId: assignee.id,
                        serverId: guildId
                    });

                    await interaction.editReply({
                        content: `Created test task with ID: ${task.id}\nYou should see an assignment notification shortly.`
                    });
                    break;
                }

                case 'due': {
                    const minutes = options.getInteger('minutes') || 1;
                    const dueDate = new Date();
                    dueDate.setMinutes(dueDate.getMinutes() + minutes);

                    const task = await taskRepository.create({
                        title: 'Test Due Date Notification',
                        description: 'Testing due date notification format',
                        status: TaskStatus.PENDING,
                        assigneeId: assignee.id,
                        dueDate,
                        serverId: guildId
                    });

                    await interaction.editReply({
                        content: `Created test task with ID: ${task.id}\nDue date set to: ${dueDate.toLocaleString()}`
                    });
                    break;
                }

                case 'overdue': {
                    const dueDate = new Date();
                    dueDate.setMinutes(dueDate.getMinutes() - 1); // Due 1 minute ago

                    const task = await taskRepository.create({
                        title: 'Test Overdue Notification',
                        description: 'Testing overdue notification format',
                        status: TaskStatus.PENDING,
                        assigneeId: assignee.id,
                        dueDate,
                        serverId: guildId
                    });

                    await interaction.editReply({
                        content: `Created test task with ID: ${task.id}\nSet as overdue, you should see a notification shortly.`
                    });
                    break;
                }

                case 'complete': {
                    const task = await taskRepository.create({
                        title: 'Test Completion Notification',
                        description: 'Testing completion notification format',
                        status: TaskStatus.PENDING,
                        assigneeId: assignee.id,
                        serverId: guildId
                    });

                    // Immediately mark as completed
                    await taskRepository.update(task.id, {
                        status: TaskStatus.COMPLETED,
                        completedDate: new Date()
                    });

                    await interaction.editReply({
                        content: `Created and completed test task with ID: ${task.id}\nYou should see a completion notification shortly.`
                    });
                    break;
                }

                case 'daily': {
                    // Create multiple tasks for the daily digest
                    const tasks = await Promise.all([
                        taskRepository.create({
                            title: 'Test Daily Digest Task 1',
                            description: 'A pending task',
                            status: TaskStatus.PENDING,
                            assigneeId: assignee.id,
                            serverId: guildId
                        }),
                        taskRepository.create({
                            title: 'Test Daily Digest Task 2',
                            description: 'An overdue task',
                            status: TaskStatus.PENDING,
                            assigneeId: assignee.id,
                            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                            serverId: guildId
                        }),
                        taskRepository.create({
                            title: 'Test Daily Digest Task 3',
                            description: 'A completed task',
                            status: TaskStatus.COMPLETED,
                            assigneeId: assignee.id,
                            completedDate: new Date(),
                            serverId: guildId
                        })
                    ]);

                    await interaction.editReply({
                        content: `Created ${tasks.length} test tasks for daily digest.\nWait for the next digest time or update the digest time in user settings.`
                    });
                    break;
                }
            }

        } catch (error) {
            console.error('Error in test notification command:', error);
            await interaction.editReply('Failed to create test notification.');
        }
    }
};

export default command;