import { ChatInputCommandInteraction } from 'discord.js';

export interface StatsCommandHandler {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface MetricsResult {
    cacheHitRate: number;
    averageResponseTime: number;
    totalChecks: number;
    checksPerRole: { [key: string]: number };
    errorRate: number;
}

export interface StatsHandlers {
    permission: StatsCommandHandler;
    // Future stat handlers can be added here
}