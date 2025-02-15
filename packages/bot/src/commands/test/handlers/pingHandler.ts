import { ChatInputCommandInteraction } from 'discord.js';
import { TestCommandHandler } from '../types.js';

export class PingHandler implements TestCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const sent = await interaction.reply({
            content: 'Pinging...',
            fetchReply: true
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! Latency: ${latency}ms`);
    }
}