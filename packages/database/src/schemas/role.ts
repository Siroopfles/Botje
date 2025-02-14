import mongoose, { Document, Schema } from 'mongoose';
import { z } from 'zod';
import { Permission, Role, UserRole } from 'shared';

// Zod schemas for validation
export const roleSchema = z.object({
    name: z.string(),
    serverId: z.string(),
    permissions: z.array(z.nativeEnum(Permission)),
    assignableBy: z.array(z.nativeEnum(Permission)),
    discordRoleId: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});

export const userRoleSchema = z.object({
    userId: z.string(),
    serverId: z.string(),
    roleId: z.string(),
    assignedBy: z.string(),
    assignedAt: z.date(),
    expiresAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
});

// Document types
interface RoleBaseDocument extends Document {
    id: string;
}

interface UserRoleBaseDocument extends Document {
    id: string;
}

export interface RoleDocument extends RoleBaseDocument, Omit<Role, 'id'> {}
export interface UserRoleDocument extends UserRoleBaseDocument, Omit<UserRole, 'id'> {}

// Mongoose schemas
const roleMongooseSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    serverId: {
        type: String,
        required: true
    },
    permissions: [{
        type: String,
        enum: Object.values(Permission),
        required: true
    }],
    assignableBy: [{
        type: String,
        enum: Object.values(Permission),
        required: true
    }],
    discordRoleId: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const userRoleMongooseSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    serverId: {
        type: String,
        required: true
    },
    roleId: {
        type: String,
        required: true
    },
    assignedBy: {
        type: String,
        required: true
    },
    assignedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create indexes
roleMongooseSchema.index({ serverId: 1, name: 1 }, { unique: true });
roleMongooseSchema.index({ serverId: 1, discordRoleId: 1 }, { unique: true, sparse: true });
userRoleMongooseSchema.index({ userId: 1, serverId: 1, roleId: 1 }, { unique: true });
userRoleMongooseSchema.index({ serverId: 1 });
userRoleMongooseSchema.index({ expiresAt: 1 });

// Create models
export const RoleModel = mongoose.model<RoleDocument>('Role', roleMongooseSchema);
export const UserRoleModel = mongoose.model<UserRoleDocument>('UserRole', userRoleMongooseSchema);

// Repository interfaces
export interface RoleRepository {
    create(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoleDocument>;
    findById(id: string): Promise<RoleDocument | null>;
    findByServerId(serverId: string): Promise<RoleDocument[]>;
    findByName(serverId: string, name: string): Promise<RoleDocument | null>;
    findByDiscordId(serverId: string, discordRoleId: string): Promise<RoleDocument | null>;
    update(id: string, role: Partial<Role>): Promise<RoleDocument | null>;
    delete(id: string): Promise<boolean>;
}

export interface UserRoleRepository {
    create(userRole: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRoleDocument>;
    findById(id: string): Promise<UserRoleDocument | null>;
    findByUser(userId: string, serverId: string): Promise<UserRoleDocument[]>;
    findByRole(roleId: string): Promise<UserRoleDocument[]>;
    findByServer(serverId: string): Promise<UserRoleDocument[]>;
    delete(id: string): Promise<boolean>;
    deleteByUserAndRole(userId: string, roleId: string): Promise<boolean>;
    getExpiredRoles(): Promise<UserRoleDocument[]>;
}