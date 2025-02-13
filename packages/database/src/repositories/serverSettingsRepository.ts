import mongoose from 'mongoose';
import { ServerSettings } from 'shared';
import {
    ServerSettingsDocument,
    ServerSettingsModel,
    ServerSettingsRepository
} from '../schemas/serverSettings.js';

export class MongoServerSettingsRepository implements ServerSettingsRepository {
    private isValidObjectId(id: string): boolean {
        return mongoose.Types.ObjectId.isValid(id);
    }

    async create(settings: Omit<ServerSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServerSettingsDocument> {
        const newSettings = new ServerSettingsModel(settings);
        await newSettings.save();
        return newSettings;
    }

    async findByServerId(serverId: string): Promise<ServerSettingsDocument | null> {
        return ServerSettingsModel.findOne({ serverId });
    }

    async update(serverId: string, settings: Partial<ServerSettings>): Promise<ServerSettingsDocument | null> {
        return ServerSettingsModel.findOneAndUpdate(
            { serverId },
            settings,
            { new: true }
        );
    }

    async delete(serverId: string): Promise<boolean> {
        const result = await ServerSettingsModel.findOneAndDelete({ serverId });
        return result !== null;
    }
}

// Factory function to create repository instance
export function createServerSettingsRepository(): ServerSettingsRepository {
    return new MongoServerSettingsRepository();
}