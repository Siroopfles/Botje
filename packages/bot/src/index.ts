import { Client, Events, GatewayIntentBits } from 'discord.js';
import * as commands from './commands/index.js';
import { commandHandler } from './utils/commandHandler.js';
import { roleEvents } from './events/roleEvents.js';
import { connect } from 'database';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { deployCommands } from './deploy-commands.js';

// Configure dotenv with explicit path
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

// Create client instance with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

// Initialize database connection
async function initDatabase(uri: string, dbName: string): Promise<void> {
    try {
        console.log('Initializing database connection...');
        const connection = await connect({ uri, dbName });

        // Handle database disconnection
        connection.on('disconnected', async () => {
            console.warn('Database disconnected. Attempting to reconnect...');
            try {
                await connect({ uri, dbName });
                console.log('Successfully reconnected to database');
            } catch (error) {
                console.error('Failed to reconnect to database:', error);
                process.exit(1);
            }
        });

        console.log('Database connection established');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}

// Initialize and start bot
async function startBot() {
    try {
        // Validate environment variables first
        const env = validateEnv();
        
        // Initialize database connection
        await initDatabase(env.MONGODB_URI, env.MONGODB_DB_NAME);
        
        // Deploy commands first
        console.log('Deploying slash commands...');
        await deployCommands(process.env.GUILD_ID); // Use GUILD_ID if set, otherwise deploy globally
        console.log('Slash commands deployed successfully');

        // Initialize command handling
        commandHandler.registerCommands(commands);
        commandHandler.setupEvents(client);

        // Set up role event handling
        console.log('Setting up role event handlers...');
        Object.entries(roleEvents).forEach(([event, handler]) => {
            client.on(event as any, handler);
        });

        // Login to Discord
        console.log('Logging in to Discord...');
        await client.login(env.DISCORD_BOT_TOKEN);

        // Bot ready event
        client.once(Events.ClientReady, c => {
            console.log(`Ready! Logged in as ${c.user.tag}`);
        });

        // Error handling
        client.on(Events.Error, error => {
            console.error('Discord client error:', error);
        });

    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await client.destroy();
    process.exit(0);
});

// Start the bot
startBot();