import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { commands, getCommandsData } from './utils/commandHandler.js';
import { connect as connectToDb } from 'database';
import { NotificationWorker } from './workers/notificationWorker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '../../../.env') });

const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'MONGODB_URI',
    'MONGODB_DB_NAME'
] as const;

requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        throw new Error(`${envVar} must be provided in environment variables`);
    }
});

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ] 
});

let notificationWorker: NotificationWorker | null = null;

async function registerCommands() {
    try {
        const commandData = getCommandsData();
        console.log('Registering commands with data:', JSON.stringify(commandData, null, 2));

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
        const response = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
            { body: commandData }
        );

        console.log('Registered commands:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('Error refreshing commands:', error);
        throw error;
    }
}

async function startNotificationWorker(client: Client) {
    try {
        notificationWorker = new NotificationWorker(client);
        notificationWorker.start();
        console.log('Notification worker started successfully');
    } catch (error) {
        console.error('Failed to start notification worker:', error);
        throw error;
    }
}

async function init() {
    try {
        console.log('Starting initialization...');
        console.log('Client ID:', process.env.DISCORD_CLIENT_ID);

        // Connect to database
        await connectToDb({
            uri: process.env.MONGODB_URI!,
            dbName: process.env.MONGODB_DB_NAME!
        });
        console.log('Connected to database');

        // Log in to Discord
        await client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
        console.error('Initialization error:', error);
        process.exit(1);
    }
}

// Handle ready event
client.once(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    try {
        await registerCommands();
        console.log('Command registration complete');
        
        // Start notification worker
        await startNotificationWorker(client);
    } catch (error) {
        console.error('Failed during startup:', error);
        process.exit(1);
    }
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        console.log('Received non-command interaction:', interaction.type);
        return;
    }

    console.log(`Received command interaction: ${interaction.commandName}`);
    const command = commands.get(interaction.commandName);
    
    if (!command) {
        console.log(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        console.log(`Executing command: ${interaction.commandName}`);
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        const reply = {
            content: 'There was an error executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Cleaning up...');
    if (notificationWorker) {
        notificationWorker.stop();
    }
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Cleaning up...');
    if (notificationWorker) {
        notificationWorker.stop();
    }
    client.destroy();
    process.exit(0);
});

// Start the bot
init().catch(error => {
    console.error('Failed to start bot:', error);
    process.exit(1);
});