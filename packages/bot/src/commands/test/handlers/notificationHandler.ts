import { ChatInputCommandInteraction } from 'discord.js';
import { createNotificationPreferencesRepository, createTaskRepository } from 'database';
import { NotificationService, TaskStatus } from 'shared';
import { TestCommandHandler, TestNotificationOptions } from '../types.js';
import { createTestTask, createTestTasks, calculateDueDate, formatError, formatSuccess } from '../utils.js';

const preferencesRepo = createNotificationPreferencesRepository();
const taskRepo = createTaskRepository();

export class NotificationHandler implements TestCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const { options, guildId } = interaction;
        if (!guildId) {
            await interaction.editReply('This command can only be used in a server.');
            return;
        }

        const subcommand = options.getSubcommand();
        const assignee = options.getUser('assignee', true);
        const testOptions: TestNotificationOptions = {
            assigneeId: assignee.id,
            serverId: guildId,
            minutes: options.getInteger('minutes') ?? undefined
        };

        try {
            // Get or create user preferences
            let preferences = await preferencesRepo.findByUserId(assignee.id, guildId);
            if (!preferences) {
                preferences = await preferencesRepo.create(
                    NotificationService.createDefaultPreferences(assignee.id, guildId)
                );
            }

            switch (subcommand) {
                case 'assignment': {
                    const task = await createTestTask({
                        title: 'Test Assignment Notification',
                        description: 'Testing assignment notification format',
                        serverId: guildId,
                        assigneeId: assignee.id
                    });

                    await interaction.editReply(formatSuccess(
                        `Created test task with ID: ${task.id}\nYou should see an assignment notification shortly.`
                    ));
                    break;
                }

                case 'due': {
                    const dueDate = calculateDueDate(testOptions.minutes || 1);
                    const task = await createTestTask({
                        title: 'Test Due Date Notification',
                        description: 'Testing due date notification format',
                        serverId: guildId,
                        assigneeId: assignee.id,
                        dueDate
                    });

                    await interaction.editReply(formatSuccess(
                        `Created test task with ID: ${task.id}\nDue date set to: ${dueDate.toLocaleString()}`
                    ));
                    break;
                }

                case 'overdue': {
                    const dueDate = calculateDueDate(-1); // Due 1 minute ago
                    const task = await createTestTask({
                        title: 'Test Overdue Notification',
                        description: 'Testing overdue notification format',
                        serverId: guildId,
                        assigneeId: assignee.id,
                        dueDate
                    });

                    await interaction.editReply(formatSuccess(
                        `Created test task with ID: ${task.id}\nSet as overdue, you should see a notification shortly.`
                    ));
                    break;
                }

                case 'complete': {
                    const task = await createTestTask({
                        title: 'Test Completion Notification',
                        description: 'Testing completion notification format',
                        serverId: guildId,
                        assigneeId: assignee.id
                    });

                    // Update to completed
                    await taskRepo.update(task.id, {
                        status: TaskStatus.COMPLETED,
                        completedDate: new Date()
                    });

                    await interaction.editReply(formatSuccess(
                        `Created and completed test task with ID: ${task.id}\nYou should see a completion notification shortly.`
                    ));
                    break;
                }

                case 'daily': {
                    const taskData = [
                        {
                            title: 'Test Daily Digest Task 1',
                            description: 'A pending task',
                            serverId: guildId,
                            assigneeId: assignee.id
                        },
                        {
                            title: 'Test Daily Digest Task 2',
                            description: 'An overdue task',
                            serverId: guildId,
                            assigneeId: assignee.id,
                            dueDate: calculateDueDate(-24 * 60) // 1 day ago
                        }
                    ];

                    const tasks = await createTestTasks(taskData, 2);
                    const completedTask = await createTestTask({
                        title: 'Test Daily Digest Task 3',
                        description: 'A completed task',
                        serverId: guildId,
                        assigneeId: assignee.id
                    });

                    await taskRepo.update(completedTask.id, {
                        status: TaskStatus.COMPLETED,
                        completedDate: new Date()
                    });

                    await interaction.editReply(formatSuccess(
                        `Created ${tasks.length + 1} test tasks for daily digest.\nWait for the next digest time or update the digest time in user settings.`
                    ));
                    break;
                }
            }
        } catch (error) {
            console.error('Error in test notification command:', error);
            await interaction.editReply(formatError(error instanceof Error ? error : new Error('Unknown error')));
        }
    }
}