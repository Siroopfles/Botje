import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';
import { ServerSettings } from 'shared';

// Zod schema for validation
export const serverSettingsSchema = z.object({
    serverId: z.string(),
    notificationChannelId: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});

// Document types
interface ServerSettingsDoc {
    serverId: string;
    notificationChannelId?: string;
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
}