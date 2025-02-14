import { TaskStatus, Task } from 'shared';
import { createTaskRepository, TaskRepository } from 'database';
import { TestTaskData } from './types.js';

const taskRepo: TaskRepository = createTaskRepository();

export async function createTestTask(data: TestTaskData): Promise<Task> {
    return await taskRepo.create({
        title: data.title,
        description: data.description,
        status: TaskStatus.PENDING,
        assigneeId: data.assigneeId,
        serverId: data.serverId,
        dueDate: data.dueDate
    });
}

export async function createTestTasks(data: TestTaskData[], count: number): Promise<Task[]> {
    const tasks = [];
    for (let i = 0; i < count; i++) {
        tasks.push({
            ...data[i],
            status: TaskStatus.PENDING
        });
    }
    return Promise.all(tasks.map(task => taskRepo.create(task)));
}

export function calculateDueDate(minutesFromNow?: number): Date {
    const date = new Date();
    if (minutesFromNow) {
        date.setMinutes(date.getMinutes() + minutesFromNow);
    }
    return date;
}

export function formatError(error: Error): string {
    return `❌ Error creating test: ${error.message}`;
}

export function formatSuccess(message: string): string {
    return `✅ ${message}`;
}

// Export taskRepo for use in handlers
export { taskRepo };