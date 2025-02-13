export interface Task {
    id: string;
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: Date;
    completedDate?: Date;
    status: TaskStatus;
    recurrence?: RecurrencePattern;
    serverId: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    OVERDUE = 'OVERDUE',
    SKIPPED = 'SKIPPED'
}

export interface RecurrencePattern {
    type: RecurrenceType;
    interval: number;
    dayOfWeek?: number[];   // 0-6, where 0 is Sunday
    dayOfMonth?: number[];  // 1-31
    endDate?: Date;
}

export enum RecurrenceType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY'
}

export interface TaskTemplate {
    id: string;
    title: string;
    description?: string;
    recurrence?: RecurrencePattern;
    serverId: string;
    createdAt: Date;
    updatedAt: Date;
}