import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getCommandsData } from './utils/commandHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../../.env') });

// Required environment variables
const requiredVars = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'] as const;
const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Type assertion since we've verified these exist
const token = process.env.DISCORD_BOT_TOKEN as string;
const clientId = process.env.DISCORD_CLIENT_ID as string;
const guildId = process.env.GUILD_ID;

const rest = new REST({ version: '10' }).setToken(token);

async function deployCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        const commands = getCommandsData();

        let data;
        if (guildId) {
            // Guild specific deployment (faster for testing)
            console.log(`Deploying commands to guild: ${guildId}`);
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
        } else {
            // Global deployment
            console.log('Deploying commands globally');
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
        }

        console.log(`Successfully reloaded ${(data as any[]).length} application (/) commands.`);
        console.log('Commands:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error deploying commands:', error);
        process.exit(1);
    }
}

deployCommands();