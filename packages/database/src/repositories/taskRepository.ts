import mongoose from 'mongoose';
import { Task, TaskStatus } from 'shared';
import { TaskDocument, TaskModel, TaskRepository } from '../schemas/task.js';

export class MongoTaskRepository implements TaskRepository {
    private isValidObjectId(id: string): boolean {
        return mongoose.Types.ObjectId.isValid(id);
    }

    async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskDocument> {
        const newTask = new TaskModel(task);
        await newTask.save();
        return newTask;
    }

    async findById(id: string): Promise<TaskDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return TaskModel.findById(id);
    }

    async findByServerId(serverId: string): Promise<TaskDocument[]> {
        return TaskModel.find({ serverId })
            .sort({ createdAt: -1 });
    }

    async findByAssignee(assigneeId: string): Promise<TaskDocument[]> {
        return TaskModel.find({ assigneeId })
            .sort({ dueDate: 1 });
    }

    async update(id: string, task: Partial<Task>): Promise<TaskDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return TaskModel.findByIdAndUpdate(id, task, { new: true });
    }

    async delete(id: string): Promise<boolean> {
        if (!this.isValidObjectId(id)) {
            return false;
        }
        const result = await TaskModel.findByIdAndDelete(id);
        return result !== null;
    }

    async findOverdueTasks(serverId: string): Promise<TaskDocument[]> {
        const now = new Date();
        return TaskModel.find({
            serverId,
            status: TaskStatus.PENDING,
            dueDate: { $lt: now }
        });
    }

    async findByStatusAndServer(serverId: string, status: TaskStatus): Promise<TaskDocument[]> {
        return TaskModel.find({ serverId, status })
            .sort({ createdAt: -1 });
    }

    async findUpcomingTasks(serverId: string, days: number = 7): Promise<TaskDocument[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        return TaskModel.find({
            serverId,
            status: TaskStatus.PENDING,
            dueDate: {
                $gte: now,
                $lte: futureDate
            }
        }).sort({ dueDate: 1 });
    }
}

// Factory function to create repository instance
export function createTaskRepository(): TaskRepository {
    return new MongoTaskRepository();
}