import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';

export interface CommandHandler {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface NotificationSettings {
  taskCreated: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskDue: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

export interface ServerSettings {
  id?: string;
  serverId: string;
  notificationSettings: NotificationSettings;
}

export interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | SlashCommandSubcommandsOnlyBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}