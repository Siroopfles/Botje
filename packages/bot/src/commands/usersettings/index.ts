import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handlers } from './handlers/index.js';
import { CommandModule } from '../../commands/index.js';

// Define valid notification types
const notificationTypes = [
  { name: 'Task Created', value: 'task-created' },
  { name: 'Task Assigned', value: 'task-assigned' },
  { name: 'Task Completed', value: 'task-completed' },
  { name: 'Task Due', value: 'task-due' },
  { name: 'Daily Digest', value: 'daily-digest' },
  { name: 'Weekly Digest', value: 'weekly-digest' }
] as const;

// Create command builder
const data = new SlashCommandBuilder()
  .setName('usersettings')
  .setDescription('View and manage your personal settings')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View your current settings')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('notifications')
      .setDescription('Configure your notification settings')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('Whether to enable or disable notifications')
          .setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' }
          )
      )
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('The type of notification to configure')
          .setRequired(true)
          .addChoices(...notificationTypes)
      )
  );

// Create command instance
export const usersettings: CommandModule = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'view':
        await handlers.view.execute(interaction);
        break;
      case 'notifications':
        await handlers.notifications.execute(interaction);
        break;
      default:
        await interaction.editReply({
          content: '❌ Unknown subcommand'
        });
    }
  }
};

// Export types and constants
export { notificationTypes };
export type NotificationType = typeof notificationTypes[number]['value'];