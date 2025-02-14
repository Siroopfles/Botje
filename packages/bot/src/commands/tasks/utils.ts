import { EmbedBuilder, User } from 'discord.js';
import { Task, TaskStatus } from 'shared';
import { createTaskRepository } from 'database';
import { TaskCreateData, TaskEditData, TaskListOptions } from './types.js';

const taskRepo = createTaskRepository();

export async function createTask(data: TaskCreateData): Promise<Task> {
    return await taskRepo.create({
        title: data.title,
        description: data.description,
        status: data.status ?? TaskStatus.PENDING,
        assigneeId: data.assigneeId,
        serverId: data.serverId,
        dueDate: data.dueDate,
        recurrence: data.recurrence
    });
}

export async function updateTask(id: string, data: TaskEditData): Promise<Task | null> {
    // Only include defined values in the update
    const updateData: Partial<Task> = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value
        }), {});

    return await taskRepo.update(id, updateData);
}

export async function completeTask(id: string): Promise<Task | null> {
    return await taskRepo.update(id, {
        status: TaskStatus.COMPLETED,
        completedDate: new Date()
    });
}

export async function findUserTasks(serverId: string, { assigneeId, status, includeOverdue }: TaskListOptions): Promise<Task[]> {
    const tasks = await taskRepo.findByServerId(serverId);
    
    return tasks.filter(task => {
        if (assigneeId && task.assigneeId !== assigneeId) return false;
        if (status && task.status !== status) return false;
        if (includeOverdue && (!task.dueDate || task.dueDate > new Date())) return false;
        return true;
    });
}

export function createTaskEmbed(task: Task, assignee?: User): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(task.title)
        .setDescription(task.description || 'No description')
        .setColor(task.status === TaskStatus.COMPLETED ? 0x00FF00 : 
                 task.dueDate && task.dueDate < new Date() ? 0xFF0000 : 
                 0x0099FF)
        .addFields([
            { name: 'Status', value: task.status, inline: true },
            { name: 'ID', value: task.id, inline: true }
        ]);

    if (assignee) {
        embed.addFields({ name: 'Assigned To', value: assignee.tag, inline: true });
    }

    if (task.dueDate) {
        embed.addFields({ name: 'Due Date', value: task.dueDate.toLocaleString(), inline: true });
    }

    if (task.completedDate) {
        embed.addFields({ name: 'Completed', value: task.completedDate.toLocaleString(), inline: true });
    }

    if (task.recurrence) {
        embed.addFields({ 
            name: 'Recurrence', 
            value: `${task.recurrence.type} (Every ${task.recurrence.interval})`, 
            inline: true 
        });
    }

    return embed;
}

export function formatTaskList(tasks: Task[]): string {
    if (tasks.length === 0) {
        return 'No tasks found.';
    }

    return tasks.map(task => {
        const dueDate = task.dueDate ? ` (Due: ${task.dueDate.toLocaleDateString()})` : '';
        const status = task.status === TaskStatus.COMPLETED ? '✅' : 
                      task.status === TaskStatus.IN_PROGRESS ? '🔄' :
                      (task.dueDate && task.dueDate < new Date()) ? '⚠️' : '📝';
        return `${status} ${task.title}${dueDate} [ID: ${task.id}]`;
    }).join('\n');
}

export function formatError(error: Error): string {
    return `❌ Error: ${error.message}`;
}

export function formatSuccess(message: string): string {
    return `✅ ${message}`;
}

// Export for use in handlers
export { taskRepo };