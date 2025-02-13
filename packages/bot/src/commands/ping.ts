import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';

export const ping: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    execute: async (interaction) => {
        const response = await interaction.reply({
            content: 'Pinging...',
        });

        const reply = await response.fetch();
        const latency = reply.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! Latency: ${latency}ms`);
    }
};