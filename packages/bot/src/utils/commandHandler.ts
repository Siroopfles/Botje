import { 
    ChatInputCommandInteraction,
    Collection,
    Events,
    Interaction,
    Client
} from 'discord.js';
import { Command } from '../types/command.js';
import { connect } from 'database';
import { checkPermissions } from '../middleware/permissionMiddleware.js';

class CommandHandler {
    private commands: Collection<string, Command>;

    constructor() {
        this.commands = new Collection();
    }

    /**
     * Register commands for use
     */
    public registerCommands(commands: { [key: string]: any }): void {
        for (const module of Object.values(commands)) {
            for (const exportedItem of Object.values(module)) {
                if (this.isCommand(exportedItem)) {
                    this.commands.set(exportedItem.data.name, exportedItem);
                }
            }
        }
    }

    /**
     * Handle incoming interactions
     */
    public async handleInteraction(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        try {
            // Ensure database connection
            if (!process.env.MONGODB_URI || !process.env.MONGODB_DB_NAME) {
                throw new Error('Database configuration missing');
            }

            await connect({
                uri: process.env.MONGODB_URI,
                dbName: process.env.MONGODB_DB_NAME
            });

            await this.executeCommand(interaction);

        } catch (error) {
            console.error('Error handling command:', error);
            await this.handleError(interaction, error);
        }
    }

    /**
     * Execute a command with permission check
     */
    private async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const command = this.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            // Check permissions before executing
            const hasPermission = await checkPermissions(interaction);
            if (!hasPermission) {
                return;
            }

            // Execute command
            await command.execute(interaction);

        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    /**
     * Handle command errors
     */
    private async handleError(interaction: ChatInputCommandInteraction, error: unknown): Promise<void> {
        console.error('Command execution error:', error);

        const errorMessage = {
            content: 'There was an error executing this command!',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }

    /**
     * Type guard for commands
     */
    private isCommand(value: any): value is Command {
        return value && 'data' in value && 'execute' in value;
    }

    /**
     * Get registered commands
     */
    public getCommands(): Collection<string, Command> {
        return this.commands;
    }

    /**
     * Set up event handling
     */
    public setupEvents(client: Client): void {
        client.on(Events.InteractionCreate, (interaction: Interaction) => this.handleInteraction(interaction));
    }
}

// Create and export singleton instance
export const commandHandler = new CommandHandler();