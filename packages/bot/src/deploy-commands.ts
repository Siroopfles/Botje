import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from 'discord.js';
import { Command } from './types/command.js';
import * as commands from './commands/index.js';
import { connect } from 'database';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../..', '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

console.log('Environment variables loaded successfully');

// Function to validate environment variables
function validateEnv(): { 
    DISCORD_BOT_TOKEN: string; 
    DISCORD_CLIENT_ID: string;
    MONGODB_URI: string;
    MONGODB_DB_NAME: string;
} {
    console.log('Checking required environment variables...');
    const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, MONGODB_URI, MONGODB_DB_NAME } = process.env;

    const missing = [];
    if (!DISCORD_BOT_TOKEN) missing.push('DISCORD_BOT_TOKEN');
    if (!DISCORD_CLIENT_ID) missing.push('DISCORD_CLIENT_ID');
    if (!MONGODB_URI) missing.push('MONGODB_URI');
    if (!MONGODB_DB_NAME) missing.push('MONGODB_DB_NAME');

    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing.join(', '));
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('Environment variables validated successfully');
    return {
        DISCORD_BOT_TOKEN: DISCORD_BOT_TOKEN as string,
        DISCORD_CLIENT_ID: DISCORD_CLIENT_ID as string,
        MONGODB_URI: MONGODB_URI as string,
        MONGODB_DB_NAME: MONGODB_DB_NAME as string
    };
}

const env = validateEnv();
const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

function isCommand(value: any): value is Command {
    if (!value || typeof value !== 'object') {
        console.log('Not a command: Not an object');
        return false;
    }
    if (!('data' in value)) {
        console.log('Not a command: Missing data property');
        return false;
    }
    if (!('execute' in value)) {
        console.log('Not a command: Missing execute property');
        return false;
    }
    console.log('Valid command object found');
    return true;
}

function isSlashCommand(data: any): data is SlashCommandBuilder {
    if (!data || typeof data !== 'object') {
        console.log('Not a slash command: Not an object');
        return false;
    }
    if (typeof data.toJSON !== 'function') {
        console.log('Not a slash command: Missing toJSON function');
        return false;
    }
    console.log('Valid slash command data found');
    return true;
}

export async function deployCommands(guildId?: string) {
    try {
        console.log('Initializing database connection...');
        await connect({
            uri: env.MONGODB_URI,
            dbName: env.MONGODB_DB_NAME
        });
        console.log('Database connection established');

        const commandsData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

        console.log('Collecting command data...');
        console.log('Commands module:', commands);
        console.log('Available commands:', Object.keys(commands));

        for (const [name, command] of Object.entries(commands)) {
            console.log(`\nProcessing command: ${name}`);
            console.log('Command object:', command);

            if (!isCommand(command)) {
                console.log(`Skipping ${name}: Not a valid command`);
                continue;
            }

            if (!isSlashCommand(command.data)) {
                console.log(`Skipping ${name}: Not a valid slash command`);
                continue;
            }

            console.log(`Converting command ${name} to JSON`);
            const jsonData = command.data.toJSON();
            console.log('JSON data:', jsonData);
            commandsData.push(jsonData);
        }

        const route = guildId 
            ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId)
            : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

        console.log(`\nStarted refreshing ${commandsData.length} application (/) commands.`);
        if (commandsData.length > 0) {
            console.log('Commands to deploy:', commandsData.map(cmd => cmd.name).join(', '));
        } else {
            console.log('No commands to deploy!');
            console.log('Command data:', commandsData);
        }
        console.log(guildId ? `Deploying to guild: ${guildId}` : 'Deploying globally');

        // Deploy commands
        const data = await rest.put(route, { body: commandsData });
        console.log('Deployment response:', data);

        console.log(`Successfully reloaded application (/) commands.`);
        return data;

    } catch (error) {
        console.error('Error deploying commands:', error);
        throw error;
    }
}

// Run deployment if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const guildId = process.env.GUILD_ID || process.argv[2];
    deployCommands(guildId)
        .then(() => {
            console.log('Command deployment completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Deployment failed:', error);
            process.exit(1);
        });
}