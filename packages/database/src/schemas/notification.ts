import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';
import { Notification, NotificationPreferences, NotificationType } from 'shared';

// Zod schemas for validation
export const notificationSchema = z.object({
    type: z.nativeEnum(NotificationType),
    userId: z.string(),
    serverId: z.string(),
    taskId: z.string().optional(),
    message: z.string(),
    read: z.boolean(),
    scheduledFor: z.date(),
    sentAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});

export const notificationPreferencesSchema = z.object({
    userId: z.string(),
    serverId: z.string(),
    discordDm: z.boolean(),
    reminderHours: z.number(),
    dailyDigest: z.boolean(),
    digestTime: z.string(),
    notifyOnAssignment: z.boolean(),
    notifyOnCompletion: z.boolean(),
    notifyOnDue: z.boolean(),
    notifyOnOverdue: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date()
});

// Document types
interface NotificationMethods {
    markAsRead(): void;
    markAsSent(): void;
}

interface NotificationDoc {
    type: NotificationType;
    userId: string;
    serverId: string;
    taskId?: string;
    message: string;
    read: boolean;
    scheduledFor: Date;
    sentAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface NotificationPreferencesDoc {
    userId: string;
    serverId: string;
    discordDm: boolean;
    reminderHours: number;
    dailyDigest: boolean;
    digestTime: string;
    notifyOnAssignment: boolean;
    notifyOnCompletion: boolean;
    notifyOnDue: boolean;
    notifyOnOverdue: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface NotificationBaseDocument extends Document {
    id: string;
}

export interface NotificationDocument extends NotificationBaseDocument, NotificationDoc, NotificationMethods {}
export interface NotificationPreferencesDocument extends NotificationBaseDocument, NotificationPreferencesDoc {}

// Mongoose schemas
const notificationMongooseSchema = new Schema({
    type: {
        type: String,
        enum: Object.values(NotificationType),
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    serverId: {
        type: String,
        required: true
    },
    taskId: {
        type: String,
        required: false
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    scheduledFor: {
        type: Date,
        required: true
    },
    sentAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const notificationPreferencesMongooseSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    serverId: {
        type: String,
        required: true
    },
    discordDm: {
        type: Boolean,
        default: true
    },
    reminderHours: {
        type: Number,
        default: 24
    },
    dailyDigest: {
        type: Boolean,
        default: true
    },
    digestTime: {
        type: String,
        default: '09:00'
    },
    notifyOnAssignment: {
        type: Boolean,
        default: true
    },
    notifyOnCompletion: {
        type: Boolean,
        default: true
    },
    notifyOnDue: {
        type: Boolean,
        default: true
    },
    notifyOnOverdue: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Helper methods
notificationMongooseSchema.methods.markAsRead = function(this: NotificationDocument): void {
    this.read = true;
};

notificationMongooseSchema.methods.markAsSent = function(this: NotificationDocument): void {
    this.sentAt = new Date();
};

// Create indexes
notificationPreferencesMongooseSchema.index({ userId: 1, serverId: 1 }, { unique: true });
notificationPreferencesMongooseSchema.index({ serverId: 1 }); // Add index for server queries
notificationMongooseSchema.index({ scheduledFor: 1 });
notificationMongooseSchema.index({ userId: 1, serverId: 1 });
notificationMongooseSchema.index({ read: 1 });
notificationMongooseSchema.index({ createdAt: 1 }); // For cleanup queries
notificationMongooseSchema.index({ taskId: 1 }); // For task-related queries

// Create models
export const NotificationModel = mongoose.model<NotificationDocument>('Notification', notificationMongooseSchema);
export const NotificationPreferencesModel = mongoose.model<NotificationPreferencesDocument>('NotificationPreferences', notificationPreferencesMongooseSchema);

// Repository pattern interfaces
export interface NotificationRepository {
    create(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationDocument>;
    findById(id: string): Promise<NotificationDocument | null>;
    findByUserId(userId: string, serverId: string): Promise<NotificationDocument[]>;
    findUnread(userId: string, serverId: string): Promise<NotificationDocument[]>;
    findScheduled(from: Date, to: Date): Promise<NotificationDocument[]>;
    markAsRead(id: string): Promise<NotificationDocument | null>;
    markAsSent(id: string): Promise<NotificationDocument | null>;
    delete(id: string): Promise<boolean>;
    // Cleanup and rate limiting methods
    cleanup(olderThan: Date, onlyRead: boolean): Promise<number>;
    countRecent(userId: string, serverId: string, since: Date): Promise<number>;
    countServerRecent(serverId: string, since: Date): Promise<number>;
    archiveForTask(taskId: string): Promise<number>;
}

export interface NotificationPreferencesRepository {
    create(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferencesDocument>;
    findByUserId(userId: string, serverId: string): Promise<NotificationPreferencesDocument | null>;
    findByServerId(serverId: string): Promise<NotificationPreferencesDocument[]>;
    update(userId: string, serverId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferencesDocument | null>;
    delete(userId: string, serverId: string): Promise<boolean>;
}