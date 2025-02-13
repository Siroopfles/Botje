import mongoose from 'mongoose';
import { Notification } from 'shared';
import {
    NotificationDocument,
    NotificationModel,
    NotificationRepository
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
        return NotificationModel.find({
            userId,
            serverId,
            read: false,
            sentAt: { $exists: false }
        }).sort({ scheduledFor: 1 });
    }

    async findUnread(userId: string, serverId: string): Promise<NotificationDocument[]> {
        return NotificationModel.find({
            userId,
            serverId,
            read: false,
            sentAt: { $exists: true }
        }).sort({ scheduledFor: 1 });
    }

    async findScheduled(from: Date, to: Date): Promise<NotificationDocument[]> {
        return NotificationModel.find({
            scheduledFor: { $gte: from, $lte: to },
            sentAt: { $exists: false }
        }).sort({ scheduledFor: 1 });
    }

    async markAsRead(id: string): Promise<NotificationDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return NotificationModel.findByIdAndUpdate(
            id,
            { read: true },
            { new: true }
        );
    }

    async markAsSent(id: string): Promise<NotificationDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return NotificationModel.findByIdAndUpdate(
            id,
            { sentAt: new Date() },
            { new: true }
        );
    }

    async delete(id: string): Promise<boolean> {
        if (!this.isValidObjectId(id)) {
            return false;
        }
        const result = await NotificationModel.findByIdAndDelete(id);
        return result !== null;
    }

    /**
     * Clean up old notifications
     * @param olderThan Date before which to clean up notifications
     * @param onlyRead Whether to only clean up read notifications
     */
    async cleanup(olderThan: Date, onlyRead: boolean = true): Promise<number> {
        const query: any = {
            createdAt: { $lt: olderThan },
            sentAt: { $exists: true }
        };

        if (onlyRead) {
            query.read = true;
        }

        const result = await NotificationModel.deleteMany(query);
        return result.deletedCount;
    }

    /**
     * Count recent notifications for rate limiting
     */
    async countRecent(userId: string, serverId: string, since: Date): Promise<number> {
        return NotificationModel.countDocuments({
            userId,
            serverId,
            sentAt: { $gte: since }
        });
    }

    /**
     * Count server-wide recent notifications for rate limiting
     */
    async countServerRecent(serverId: string, since: Date): Promise<number> {
        return NotificationModel.countDocuments({
            serverId,
            sentAt: { $gte: since }
        });
    }

    /**
     * Archive notifications for completed tasks
     */
    async archiveForTask(taskId: string): Promise<number> {
        const result = await NotificationModel.updateMany(
            { taskId },
            { read: true }
        );
        return result.modifiedCount;
    }
}

// Factory function to create repository instance
export function createNotificationRepository(): NotificationRepository {
    return new MongoNotificationRepository();
}