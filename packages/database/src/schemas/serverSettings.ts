import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';
import { ServerSettings, ServerNotificationSettings } from 'shared';

// Zod schema for validation
export const serverSettingsSchema = z.object({
    serverId: z.string(),
    notificationChannelId: z.string().optional(),
    maxDailyServerNotifications: z.number().min(0).optional(),
    notificationRetentionDays: z.number().min(1).optional(),
    cleanupUnreadAfterDays: z.number().min(1).optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});

// Document types
interface ServerSettingsDoc {
    serverId: string;
    notificationChannelId?: string;
    maxDailyServerNotifications?: number;
    notificationRetentionDays?: number;
    cleanupUnreadAfterDays?: number;
    createdAt: Date;
    updatedAt: Date;
}

interface ServerSettingsBaseDocument extends Document {
    id: string;
}

export interface ServerSettingsDocument extends ServerSettingsBaseDocument, ServerSettingsDoc {}

// Mongoose schema
const serverSettingsMongooseSchema = new Schema({
    serverId: {
        type: String,
        required: true,
        unique: true
    },
    notificationChannelId: {
        type: String,
        required: false
    },
    maxDailyServerNotifications: {
        type: Number,
        required: false,
        min: 0,
        default: 0 // 0 means unlimited
    },
    notificationRetentionDays: {
        type: Number,
        required: false,
        min: 1,
        default: 30 // Keep notifications for 30 days by default
    },
    cleanupUnreadAfterDays: {
        type: Number,
        required: false,
        min: 1,
        default: 90 // Keep unread notifications for 90 days by default
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add indexes
serverSettingsMongooseSchema.index({ serverId: 1 }, { unique: true });

// Create model
export const ServerSettingsModel = mongoose.model<ServerSettingsDocument>('ServerSettings', serverSettingsMongooseSchema);

// Repository pattern interface
export interface ServerSettingsRepository {
    findByServerId(serverId: string): Promise<ServerSettingsDocument | null>;
    update(serverId: string, settings: Partial<ServerSettings>): Promise<ServerSettingsDocument | null>;
    create(settings: Omit<ServerSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServerSettingsDocument>;
    delete(serverId: string): Promise<boolean>;
    
    // Get notification settings with defaults
    getNotificationSettings(serverId: string): Promise<ServerNotificationSettings>;
}