import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';
import { Task, TaskStatus, RecurrenceType } from 'shared';

// Zod schema for validation
export const taskSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    assigneeId: z.string().optional(),
    dueDate: z.date().optional(),
    completedDate: z.date().optional(),
    status: z.nativeEnum(TaskStatus),
    recurrence: z.object({
        type: z.nativeEnum(RecurrenceType),
        interval: z.number().min(1),
        dayOfWeek: z.array(z.number().min(0).max(6)).optional(),
        dayOfMonth: z.array(z.number().min(1).max(31)).optional(),
        endDate: z.date().optional()
    }).optional(),
    serverId: z.string(),
    createdAt: z.date(),
    updatedAt: z.date()
});

interface TaskMethods {
    isOverdue(): boolean;
    markComplete(): void;
}

export type TaskDocument = Document & Task & TaskMethods;

// Mongoose schema
const taskMongooseSchema = new Schema<TaskDocument>({
    title: { type: String, required: true },
    description: String,
    assigneeId: String,
    dueDate: Date,
    completedDate: Date,
    status: {
        type: String,
        enum: Object.values(TaskStatus),
        required: true
    },
    recurrence: {
        type: {
            type: String,
            enum: Object.values(RecurrenceType)
        },
        interval: Number,
        dayOfWeek: [Number],
        dayOfMonth: [Number],
        endDate: Date
    },
    serverId: { type: String, required: true }
}, {
    timestamps: true,
    versionKey: false
});

// Create indexes
taskMongooseSchema.index({ serverId: 1 });
taskMongooseSchema.index({ assigneeId: 1 });
taskMongooseSchema.index({ status: 1 });
taskMongooseSchema.index({ dueDate: 1 });

// Helper methods
taskMongooseSchema.methods.isOverdue = function(this: TaskDocument): boolean {
    return Boolean(this.dueDate && this.status === TaskStatus.PENDING && new Date() > this.dueDate);
};

taskMongooseSchema.methods.markComplete = function(this: TaskDocument): void {
    this.status = TaskStatus.COMPLETED;
    this.completedDate = new Date();
};

// Pre-save middleware to check for overdue tasks
taskMongooseSchema.pre('save', function(this: TaskDocument, next: Function): void {
    if (this.isOverdue()) {
        this.status = TaskStatus.OVERDUE;
    }
    next();
});

// Create the model
export const TaskModel = mongoose.model<TaskDocument>('Task', taskMongooseSchema);

// Repository pattern interface
export interface TaskRepository {
    create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskDocument>;
    findById(id: string): Promise<TaskDocument | null>;
    findByServerId(serverId: string): Promise<TaskDocument[]>;
    findByAssignee(assigneeId: string): Promise<TaskDocument[]>;
    findByStatusAndServer(serverId: string, status: TaskStatus): Promise<TaskDocument[]>;
    findOverdueTasks(serverId: string): Promise<TaskDocument[]>;
    findUpcomingTasks(serverId: string, days?: number): Promise<TaskDocument[]>;
    update(id: string, task: Partial<Task>): Promise<TaskDocument | null>;
    delete(id: string): Promise<boolean>;
}