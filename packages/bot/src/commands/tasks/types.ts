import { ChatInputCommandInteraction } from 'discord.js';
import { TaskStatus, RecurrencePattern } from 'shared';

export interface TaskCommandHandler {
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export interface TaskHandlers {
    create: TaskCommandHandler;
    edit: TaskCommandHandler;
    delete: TaskCommandHandler;
    list: TaskCommandHandler;
    complete: TaskCommandHandler;
    assign: TaskCommandHandler;
}

export interface TaskCreateData {
    title: string;
    description?: string;
    dueDate?: Date;
    assigneeId?: string;
    serverId: string;
    status?: TaskStatus;
    recurrence?: RecurrencePattern;
}

export interface TaskEditData {
    title?: string;
    description?: string;
    dueDate?: Date;
    assigneeId?: string;
    status?: TaskStatus;
    recurrence?: RecurrencePattern;
}

export interface TaskListOptions {
    assigneeId?: string;
    status?: TaskStatus;
    includeOverdue?: boolean;
}

export interface TaskAssignData {
    taskId: string;
    assigneeId: string;
    serverId: string;
}