import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handlers } from './handlers/index.js';
import { Command } from '../../types.js';

// Define valid notification types
const notificationTypes = [
  { name: 'Task Created', value: 'task-created' },
  { name: 'Task Assigned', value: 'task-assigned' },
  { name: 'Task Completed', value: 'task-completed' },
  { name: 'Task Due', value: 'task-due' },
  { name: 'Daily Digest', value: 'daily-digest' },
  { name: 'Weekly Digest', value: 'weekly-digest' }
] as const;

// Create command registration
const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Manage server settings')
  .setDefaultMemberPermissions('ManageGuild')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View current server settings')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('notifications')
      .setDescription('Configure server notification settings')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('Whether to enable or disable the notification')
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

// Export command
export const settings: Command = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'view':
      case 'notifications':
        await handlers.server.execute(interaction);
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
export type { NotificationSettings, ServerSettings } from '../../types.js';