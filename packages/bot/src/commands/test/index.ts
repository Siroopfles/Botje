import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { handlers } from './handlers/index.js';
import { CommandModule } from '../../commands/index.js';

// Create command builder
const data = new SlashCommandBuilder()
  .setName('test')
  .setDescription('Test bot functionality')
  .setDefaultMemberPermissions('Administrator')
  .addSubcommand(subcommand =>
    subcommand
      .setName('ping')
      .setDescription('Test bot latency')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('system')
      .setDescription('View system information and stats')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('notification')
      .setDescription('Test notification system')
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Type of notification to test')
          .setRequired(true)
          .addChoices(
            { name: 'Direct Message', value: 'message' },
            { name: 'Channel', value: 'channel' },
            { name: 'User', value: 'send' }
          )
      )
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to send the test notification to')
          .setRequired(false)
      )
      .addStringOption(option =>
        option
          .setName('message')
          .setDescription('Test message content')
          .setRequired(false)
          .setMaxLength(1000)
      )
  );

// Create command instance
export const test: CommandModule = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'ping':
        const start = Date.now();
        await interaction.deferReply();
        const latency = Date.now() - start;
        await interaction.editReply({
          content: `🏓 Pong! Latency: ${latency}ms`
        });
        break;

      case 'system':
        await handlers.system.execute(interaction);
        break;

      case 'notification':
        await handlers.notification.execute(interaction);
        break;

      default:
        await interaction.editReply({
          content: '❌ Unknown subcommand'
        });
    }
  }
};

// Export command
export { test as command };
