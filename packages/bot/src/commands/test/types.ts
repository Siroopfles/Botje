import { ChatInputCommandInteraction } from 'discord.js';

export interface TestCommandHandler {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface TestHandlers {
    notification: TestCommandHandler;
    ping: TestCommandHandler;
    // Add more test handlers here as needed
}

export interface TestTaskData {
    title: string;
    description: string;
    dueDate?: Date;
    serverId: string;
    assigneeId: string;
}

export interface TestNotificationOptions {
    assigneeId: string;
    serverId: string;
    minutes?: number;
}