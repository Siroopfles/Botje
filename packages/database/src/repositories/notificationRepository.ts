import mongoose from 'mongoose';
import { Notification, NotificationPreferences } from 'shared';
import {
    NotificationDocument,
    NotificationModel,
    NotificationRepository,
    NotificationPreferencesDocument,
    NotificationPreferencesModel,
    NotificationPreferencesRepository
} from '../schemas/notification.js';

export class MongoNotificationRepository implements NotificationRepository {
    private isValidObjectId(id: string): boolean {
        return mongoose.Types.ObjectId.isValid(id);
    }

    async create(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationDocument> {
        const newNotification = new NotificationModel(notification);
        await newNotification.save();
        return newNotification;
    }

    async findById(id: string): Promise<NotificationDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return NotificationModel.findById(id);
    }

    async findByUserId(userId: string, serverId: string): Promise<NotificationDocument[]> {
        return NotificationModel.find({ userId, serverId })
            .sort({ scheduledFor: -1 });
    }

    async findUnread(userId: string, serverId: string): Promise<NotificationDocument[]> {
        return NotificationModel.find({ 
            userId, 
            serverId,
            read: false 
        }).sort({ scheduledFor: 1 });
    }

    async findScheduled(from: Date, to: Date): Promise<NotificationDocument[]> {
        return NotificationModel.find({
            scheduledFor: {
                $gte: from,
                $lte: to
            },
            sentAt: null
        }).sort({ scheduledFor: 1 });
    }

    async markAsRead(id: string): Promise<NotificationDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        const notification = await NotificationModel.findById(id);
        if (!notification) {
            return null;
        }
        notification.markAsRead();
        await notification.save();
        return notification;
    }

    async markAsSent(id: string): Promise<NotificationDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        const notification = await NotificationModel.findById(id);
        if (!notification) {
            return null;
        }
        notification.markAsSent();
        await notification.save();
        return notification;
    }

    async delete(id: string): Promise<boolean> {
        if (!this.isValidObjectId(id)) {
            return false;
        }
        const result = await NotificationModel.findByIdAndDelete(id);
        return result !== null;
    }
}

export class MongoNotificationPreferencesRepository implements NotificationPreferencesRepository {
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

// Factory functions to create repository instances
export function createNotificationRepository(): NotificationRepository {
    return new MongoNotificationRepository();
}

export function createNotificationPreferencesRepository(): NotificationPreferencesRepository {
    return new MongoNotificationPreferencesRepository();
}