import { 
    ChatInputCommandInteraction, 
    Client, 
    Collection, 
    SlashCommandBuilder 
} from 'discord.js';
import { Command } from '../types/command.js';
import * as commands from '../commands/index.js';

class CommandManager {
    private commands: Collection<string, Command>;

    constructor() {
        this.commands = new Collection();
        this.loadCommands();
    }

    private loadCommands(): void {
        console.log('Loading commands...');
        console.log('Available commands:', Object.keys(commands));

        // Load each command from the commands module
        for (const [name, command] of Object.entries(commands)) {
            console.log(`Processing command: ${name}`);
            
            if (!command || typeof command !== 'object') {
                console.log(`Skipping ${name}: Invalid command object`);
                continue;
            }

            if (!('data' in command) || !('execute' in command)) {
                console.log(`Skipping ${name}: Missing data or execute`);
                continue;
            }

            if (!(command.data instanceof SlashCommandBuilder)) {
                console.log(`Skipping ${name}: Invalid command data`);
                continue;
            }

            console.log(`Registering command: ${name} (${command.data.name})`);
            this.commands.set(command.data.name, command);
        }

        console.log('Loaded commands:', Array.from(this.commands.keys()));
    }

    public async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const { commandName } = interaction;
        const command = this.commands.get(commandName);

        if (!command) {
            console.error(`Command not found: ${commandName}`);
            await interaction.reply({ 
                content: 'This command is not currently available.', 
                ephemeral: true 
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            const reply = {
                content: 'There was an error while executing this command!',
                ephemeral: true
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }

    public getCommands(): Collection<string, Command> {
        return this.commands;
    }
}

export function setupCommandHandler(client: Client) {
    console.log('Setting up command handler...');
    const manager = new CommandManager();

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;
        await manager.handleCommand(interaction);
    });

    return manager;
}