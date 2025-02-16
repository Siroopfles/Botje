import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handlers } from './handlers/index.js';
import { Command } from '../../types.js';
import type { Period } from './types.js';

// Define period choices
const periodChoices = [
  { name: 'Today', value: 'day' },
  { name: 'This Week', value: 'week' },
  { name: 'This Month', value: 'month' },
  { name: 'All Time', value: 'all' }
] as const;

// Create command builder
const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View various statistics')
  .setDefaultMemberPermissions('ManageGuild')
  .addSubcommandGroup(group =>
    group
      .setName('permissions')
      .setDescription('Permission related statistics')
      .addSubcommand(subcommand =>
        subcommand
          .setName('view')
          .setDescription('View permission statistics')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('reset')
          .setDescription('Reset permission metrics')
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('tasks')
      .setDescription('View task statistics')
      .addStringOption(option =>
        option
          .setName('period')
          .setDescription('Time period to view stats for')
          .setRequired(false)
          .addChoices(...periodChoices)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('users')
      .setDescription('View user activity statistics')
      .addUserOption(option =>
        option
          .setName('target')
          .setDescription('User to view stats for (defaults to yourself)')
          .setRequired(false)
      )
  );

// Create command instance
export const stats: Command = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      // Ensure guild context
      if (!interaction.guild) {
        await interaction.editReply({
          content: '❌ This command can only be used in a server'
        });
        return;
      }

      const group = interaction.options.getSubcommandGroup(false);
      const subcommand = interaction.options.getSubcommand();

      // Handle permission subcommands
      if (group === 'permissions') {
        await handlers.permission.execute(interaction);
        return;
      }

      // Handle other subcommands
      switch (subcommand) {
        case 'tasks':
          await handlers.tasks.execute(interaction);
          break;

        case 'users':
          await handlers.users.execute(interaction);
          break;

        default:
          await interaction.editReply({
            content: '❌ Unknown command'
          });
      }
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to fetch statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
};

// Export command
export { stats as command };

// Re-export types
export type {
  Period,
  StatsCommandHandler,
  TaskMetrics,
  UserMetrics,
  PermissionMetrics
} from './types.js';