import { ChatInputCommandInteraction } from 'discord.js';
import { ServerSettingsRepository, createServerSettingsRepository } from 'database';
import { CommandHandler, NotificationSettings, ServerSettings } from '../../../types.js';

export class ServerSettingsHandler implements CommandHandler {
  private settingsRepo: ServerSettingsRepository;

  constructor() {
    this.settingsRepo = createServerSettingsRepository();
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check for guild context
    if (!interaction.guildId) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server'
      });
      return;
    }

    // Check permissions
    if (!interaction.memberPermissions?.has('ManageGuild')) {
      await interaction.editReply({
        content: '❌ You need the Manage Server permission to use this command'
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'view':
          await this.handleView(interaction);
          break;
        case 'notifications':
          await this.handleNotifications(interaction);
          break;
        default:
          await interaction.editReply({
            content: '❌ Invalid subcommand'
          });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      await interaction.editReply({
        content: `❌ Failed to ${subcommand} server settings: ${errorMessage}`
      });
    }
  }

  private async handleView(interaction: ChatInputCommandInteraction): Promise<void> {
    const settings = await this.getSettings(interaction.guildId!);
    
    if (!settings) {
      await interaction.editReply({
        content: '❌ No server settings found. Use `/settings notifications` to configure settings.'
      });
      return;
    }

    const response = [
      '⚙️ Server Notification Settings',
      `${settings.taskCreated ? '✅' : '❌'} Task Created`,
      `${settings.taskAssigned ? '✅' : '❌'} Task Assigned`,
      `${settings.taskCompleted ? '✅' : '❌'} Task Completed`,
      `${settings.taskDue ? '✅' : '❌'} Task Due`,
      `${settings.dailyDigest ? '✅' : '❌'} Daily Digest`,
      `${settings.weeklyDigest ? '✅' : '❌'} Weekly Digest`,
      '',
      'Use `/settings notifications` to change these settings'
    ].join('\n');

    await interaction.editReply({ content: response });
  }

  private async handleNotifications(interaction: ChatInputCommandInteraction): Promise<void> {
    const action = interaction.options.getString('action');
    const type = interaction.options.getString('type');

    if (!action || !type) {
      await interaction.editReply({
        content: '❌ Both action and notification type are required'
      });
      return;
    }

    if (action !== 'enable' && action !== 'disable') {
      await interaction.editReply({
        content: '❌ Invalid action. Use "enable" or "disable"'
      });
      return;
    }

    const validTypes = [
      'task-created',
      'task-assigned',
      'task-completed',
      'task-due',
      'daily-digest',
      'weekly-digest'
    ];

    if (!validTypes.includes(type)) {
      await interaction.editReply({
        content: '❌ Invalid notification type'
      });
      return;
    }

    const enabled = action === 'enable';
    const typeKey = type.replace(/-./g, x => x[1].toUpperCase()) as keyof NotificationSettings;
    
    const settings = await this.getSettings(interaction.guildId!);
    if (!settings) {
      await interaction.editReply({
        content: '❌ Server settings not found'
      });
      return;
    }

    if (settings[typeKey] === enabled) {
      await interaction.editReply({
        content: `❓ ${type} notifications are already ${action}d for the server`
      });
      return;
    }

    const updatedSettings: ServerSettings = {
      serverId: interaction.guildId!,
      notificationSettings: {
        ...settings,
        [typeKey]: enabled
      }
    };

    await this.settingsRepo.update(interaction.guildId!, updatedSettings);

    await interaction.editReply({
      content: `✅ ${type} notifications ${action}d for the server`
    });
  }

  private async getSettings(serverId: string): Promise<NotificationSettings | null> {
    const settings = await this.settingsRepo.getNotificationSettings(serverId);
    return settings as NotificationSettings | null;
  }
}

export const handler = new ServerSettingsHandler();