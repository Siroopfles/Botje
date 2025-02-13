import { 
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody, 
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';

export interface Command {
    data: | SlashCommandBuilder 
          | SlashCommandSubcommandsOnlyBuilder 
          | Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">
          | RESTPostAPIChatInputApplicationCommandsJSONBody;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}