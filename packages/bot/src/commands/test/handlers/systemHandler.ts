import { ChatInputCommandInteraction } from 'discord.js';
import { TestCommandHandler } from '../types.js';

export class SystemHandler implements TestCommandHandler {
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ping':
                await this.handlePing(interaction);
                break;
            default:
                await interaction.editReply('❌ Unknown system test command');
        }
    }

    private async handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
        const sent = await interaction.editReply('Pinging...');
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! Latency: ${latency}ms`);
    }
}