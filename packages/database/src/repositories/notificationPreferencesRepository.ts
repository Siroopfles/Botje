import mongoose from 'mongoose';
import { NotificationPreferences } from 'shared';
import {
    NotificationPreferencesDocument,
    NotificationPreferencesModel,
    NotificationPreferencesRepository
} from '../schemas/notification.js';

export class MongoNotificationPreferencesRepository implements NotificationPreferencesRepository {
    private isValidObjectId(id: string): boolean {
        return mongoose.Types.ObjectId.isValid(id);
    }

    async create(preferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreferencesDocument> {
        const newPreferences = new NotificationPreferencesModel(preferences);
        await newPreferences.save();
        return newPreferences;
    }

    async findByUserId(userId: string, serverId: string): Promise<NotificationPreferencesDocument | null> {
        return NotificationPreferencesModel.findOne({ userId, serverId });
    }

    async findByServerId(serverId: string): Promise<NotificationPreferencesDocument[]> {
        return NotificationPreferencesModel.find({ serverId });
    }

    async update(userId: string, serverId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferencesDocument | null> {
        return NotificationPreferencesModel.findOneAndUpdate(
            { userId, serverId },
            preferences,
            { new: true }
        );
    }

    async delete(userId: string, serverId: string): Promise<boolean> {
        const result = await NotificationPreferencesModel.findOneAndDelete({ userId, serverId });
        return result !== null;
    }
}

// Factory function to create repository instance
export function createNotificationPreferencesRepository(): NotificationPreferencesRepository {
    return new MongoNotificationPreferencesRepository();
}