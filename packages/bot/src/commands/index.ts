import type { 
  SlashCommandBuilder, 
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';

// Define command types
type CommandData = 
  | SlashCommandBuilder 
  | SlashCommandSubcommandsOnlyBuilder 
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
  | RESTPostAPIChatInputApplicationCommandsJSONBody;

interface CommandModule {
  data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

// Import commands
import { tasks } from './tasks/index.js';
import { settings } from './settings/index.js';
import { test } from './test/index.js';
import { usersettings } from './usersettings/index.js';
import { stats } from './stats/index.js';
import { roles } from './roles/index.js';

// Create a type-safe command map that allows both builder and JSON data
const commandMap = {
  tasks,
  settings,
  test,
  'user-settings': usersettings,
  stats,
  roles
} as const;

// Export commands with type assertion
export const commands: Record<keyof typeof commandMap, CommandModule> = commandMap;

// Export command types
export type { CommandModule, CommandData };
export type Commands = typeof commands;
export type CommandNames = keyof Commands;

// Export individual commands (mainly for testing)
export { 
  tasks,
  settings,
  test as testCommand,
  usersettings,
  stats,
  roles
};

// Helper function to ensure command data is in correct format
export function isCommandData(data: unknown): data is CommandData {
  if (!data || typeof data !== 'object') return false;
  
  const d = data as Partial<CommandData>;
  return typeof d.name === 'string' && typeof d.description === 'string';
}