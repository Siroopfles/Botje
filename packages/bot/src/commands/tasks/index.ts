import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handlers } from './handlers/index.js';
import { CommandModule } from '../../commands/index.js';
import { TaskStatus } from 'shared';

// Task status choices
const statusChoices = [
  { name: 'Pending', value: TaskStatus.PENDING },
  { name: 'Completed', value: TaskStatus.COMPLETED }
] as const;

// Create command builder
const data = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('Manage tasks')
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Create a new task')
      .addStringOption(option => 
        option
          .setName('title')
          .setDescription('Task title')
          .setRequired(true)
          .setMaxLength(100)
      )
      .addStringOption(option =>
        option
          .setName('description')
          .setDescription('Task description')
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addIntegerOption(option =>
        option
          .setName('due')
          .setDescription('Due date (timestamp)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List tasks')
      .addStringOption(option =>
        option
          .setName('status')
          .setDescription('Filter by status')
          .setRequired(false)
          .addChoices(...statusChoices)
      )
      .addUserOption(option =>
        option
          .setName('assignee')
          .setDescription('Filter by assignee')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('edit')
      .setDescription('Edit a task')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Task ID')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('title')
          .setDescription('New task title')
          .setRequired(false)
          .setMaxLength(100)
      )
      .addStringOption(option =>
        option
          .setName('description')
          .setDescription('New task description')
          .setRequired(false)
          .setMaxLength(1000)
      )
      .addIntegerOption(option =>
        option
          .setName('due')
          .setDescription('New due date (timestamp)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('assign')
      .setDescription('Assign a task')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Task ID')
          .setRequired(true)
      )
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to assign the task to')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('complete')
      .setDescription('Mark a task as completed')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Task ID')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('notes')
          .setDescription('Completion notes')
          .setRequired(false)
          .setMaxLength(1000)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('delete')
      .setDescription('Delete a task')
      .addStringOption(option =>
        option
          .setName('id')
          .setDescription('Task ID')
          .setRequired(true)
      )
  );

// Create command instance
export const tasks: CommandModule = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'create':
        await handlers.create.execute(interaction);
        break;
      case 'list':
        await handlers.list.execute(interaction);
        break;
      case 'edit':
        await handlers.edit.execute(interaction);
        break;
      case 'assign':
        await handlers.assign.execute(interaction);
        break;
      case 'complete':
        await handlers.complete.execute(interaction);
        break;
      case 'delete':
        await handlers.delete.execute(interaction);
        break;
      default:
        await interaction.editReply({
          content: '❌ Unknown subcommand'
        });
    }
  }
};

// Export types and constants
export { statusChoices };
export type TaskStatusChoice = typeof statusChoices[number]['value'];