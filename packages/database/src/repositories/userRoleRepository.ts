import mongoose from 'mongoose';
import { UserRole } from 'shared';
import {
    UserRoleDocument,
    UserRoleModel,
    UserRoleRepository
} from '../schemas/role.js';

export class MongoUserRoleRepository implements UserRoleRepository {
    private isValidObjectId(id: string): boolean {
        return mongoose.Types.ObjectId.isValid(id);
    }

    async create(userRole: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRoleDocument> {
        const newUserRole = new UserRoleModel(userRole);
        await newUserRole.save();
        return newUserRole;
    }

    async findById(id: string): Promise<UserRoleDocument | null> {
        if (!this.isValidObjectId(id)) {
            return null;
        }
        return UserRoleModel.findById(id);
    }

    async findByUser(userId: string, serverId: string): Promise<UserRoleDocument[]> {
        return UserRoleModel.find({ 
            userId, 
            serverId,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } }
            ]
        });
    }

    async findByRole(roleId: string): Promise<UserRoleDocument[]> {
        return UserRoleModel.find({ 
            roleId,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } }
            ]
        });
    }

    async findByServer(serverId: string): Promise<UserRoleDocument[]> {
        return UserRoleModel.find({ 
            serverId,
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } }
            ]
        });
    }

    async delete(id: string): Promise<boolean> {
        if (!this.isValidObjectId(id)) {
            return false;
        }
        const result = await UserRoleModel.findByIdAndDelete(id);
        return result !== null;
    }

    async deleteByUserAndRole(userId: string, roleId: string): Promise<boolean> {
        const result = await UserRoleModel.deleteOne({ userId, roleId });
        return result.deletedCount > 0;
    }

    async getExpiredRoles(): Promise<UserRoleDocument[]> {
        return UserRoleModel.find({
            expiresAt: { 
                $exists: true,
                $lte: new Date()
            }
        });
    }

    async deleteExpiredRoles(): Promise<number> {
        const result = await UserRoleModel.deleteMany({
            expiresAt: { 
                $exists: true,
                $lte: new Date()
            }
        });
        return result.deletedCount;
    }
}

// Factory function to create repository instance
export function createUserRoleRepository(): UserRoleRepository {
    return new MongoUserRoleRepository();
}