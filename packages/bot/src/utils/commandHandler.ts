import { Collection } from 'discord.js';
import type { Command } from '../types/command.js';
import { ping } from '../commands/ping.js';
import { task } from '../commands/tasks/task.js';

// Initialize command collection
export const commands = new Collection<string, Command>();

// Register commands
commands.set('ping', ping);
commands.set('task', task);

// Function to get all commands for registration with Discord API
export const getCommandsData = () => {
    return Array.from(commands.values()).map(command => {
        if ('toJSON' in command.data) {
            return command.data.toJSON();
        }
        return command.data;
    });
};

// Debug log registered commands
console.log('Registered commands:', Array.from(commands.keys()));