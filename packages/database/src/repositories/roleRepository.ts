import mongoose from 'mongoose';
import { Role } from 'shared';
import {
    RoleDocument,
    RoleModel,
    RoleRepository
} from '../schemas/role.js';

export class MongoRoleRepository implements RoleRepository {
    private isValidObjectId(id: string): boolean {
        return mongoose.Types.ObjectId.isValid(id);
    }

    async create(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleDocument> {
        const newRole = new RoleModel(role);
        await newRole.save();
        return newRole;
    }

    async findById(id: string): Promise<RoleDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return RoleModel.findById(id);
    }

    async findByServerId(serverId: string): Promise<RoleDocument[]> {
        return RoleModel.find({ serverId });
    }

    async findByName(serverId: string, name: string): Promise<RoleDocument | null> {
        return RoleModel.findOne({ serverId, name });
    }

    async findByDiscordId(serverId: string, discordRoleId: string): Promise<RoleDocument | null> {
        return RoleModel.findOne({ serverId, discordRoleId });
    }

    async update(id: string, role: Partial<Role>): Promise<RoleDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return RoleModel.findByIdAndUpdate(id, role, { new: true });
    }

    async delete(id: string): Promise<boolean> {
        if (!this.isValidObjectId(id)) {
            return false;
        }
        const result = await RoleModel.findByIdAndDelete(id);
        return result !== null;
    }
}

// Factory function to create repository instance
export function createRoleRepository(): RoleRepository {
    return new MongoRoleRepository();
}