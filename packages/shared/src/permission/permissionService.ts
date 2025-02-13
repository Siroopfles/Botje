import { Permission, Role, UserRole, hasPermission } from '../types/permission.js';

// Interfaces from database package
interface RoleRepository {
    findById(id: string): Promise<Role | null>;
}

interface UserRoleDocument extends UserRole {
    id: string;
}

interface UserRoleRepository {
    findByUser(userId: string, serverId: string): Promise<UserRoleDocument[]>;
}

interface PermissionCache {
    [userId: string]: {
        [serverId: string]: {
            permissions: Permission[];
            roles: Role[];
            lastUpdated: number;
        }
    }
}

export class PermissionService {
    private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private static cache: PermissionCache = {};

    /**
     * Check if a user has a specific permission in a server
     */
    public static async hasPermission(
        userId: string,
        serverId: string,
        permission: Permission,
        roleRepo: RoleRepository,
        userRoleRepo: UserRoleRepository,
        options: { ignoreCache?: boolean } = {}
    ): Promise<boolean> {
        const userPermissions = await this.getUserPermissions(
            userId, 
            serverId, 
            roleRepo,
            userRoleRepo,
            options
        );
        return hasPermission(userPermissions, permission);
    }

    /**
     * Get all permissions for a user in a server
     */
    public static async getUserPermissions(
        userId: string,
        serverId: string,
        roleRepo: RoleRepository,
        userRoleRepo: UserRoleRepository,
        options: { ignoreCache?: boolean } = {}
    ): Promise<Permission[]> {
        // Check cache first
        if (!options.ignoreCache && this.isCacheValid(userId, serverId)) {
            return this.cache[userId]?.[serverId]?.permissions ?? [];
        }

        // Get user's roles
        const userRoles = await userRoleRepo.findByUser(userId, serverId);
        const roles = await Promise.all(
            userRoles.map((ur: UserRoleDocument) => roleRepo.findById(ur.roleId))
        );

        // Combine permissions from all roles
        const permissions = new Set<Permission>();
        roles.forEach((role: Role | null) => {
            if (role) {
                role.permissions.forEach((p: Permission) => permissions.add(p));
            }
        });

        // Update cache
        const validRoles = roles.filter((r: Role | null): r is Role => r !== null);
        this.updateCache(userId, serverId, Array.from(permissions), validRoles);

        return Array.from(permissions);
    }

    /**
     * Get all roles for a user in a server
     */
    public static async getUserRoles(
        userId: string,
        serverId: string,
        roleRepo: RoleRepository,
        userRoleRepo: UserRoleRepository,
        options: { ignoreCache?: boolean } = {}
    ): Promise<Role[]> {
        // Check cache first
        if (!options.ignoreCache && this.isCacheValid(userId, serverId)) {
            return this.cache[userId]?.[serverId]?.roles ?? [];
        }

        // Get user's roles
        const userRoles = await userRoleRepo.findByUser(userId, serverId);
        const roles = await Promise.all(
            userRoles.map((ur: UserRoleDocument) => roleRepo.findById(ur.roleId))
        );

        // Filter out null values and update cache
        const validRoles = roles.filter((r: Role | null): r is Role => r !== null);
        this.updateCache(userId, serverId, this.getRolePermissions(validRoles), validRoles);

        return validRoles;
    }

    /**
     * Check if a user can assign a role
     */
    public static async canAssignRole(
        userId: string,
        serverId: string,
        roleId: string,
        roleRepo: RoleRepository,
        userRoleRepo: UserRoleRepository
    ): Promise<boolean> {
        const role = await roleRepo.findById(roleId);
        if (!role) {
            return false;
        }

        const userPermissions = await this.getUserPermissions(userId, serverId, roleRepo, userRoleRepo);
        return role.assignableBy.some((permission: Permission) => hasPermission(userPermissions, permission));
    }

    /**
     * Get combined permissions from multiple roles
     */
    private static getRolePermissions(roles: Role[]): Permission[] {
        const permissions = new Set<Permission>();
        roles.forEach(role => {
            role.permissions.forEach((p: Permission) => permissions.add(p));
        });
        return Array.from(permissions);
    }

    /**
     * Update the permission cache
     */
    private static updateCache(
        userId: string,
        serverId: string,
        permissions: Permission[],
        roles: Role[]
    ): void {
        this.cache[userId] = this.cache[userId] || {};
        this.cache[userId][serverId] = {
            permissions,
            roles,
            lastUpdated: Date.now()
        };
    }

    /**
     * Check if cached data is still valid
     */
    private static isCacheValid(userId: string, serverId: string): boolean {
        const cached = this.cache[userId]?.[serverId];
        if (!cached) {
            return false;
        }

        return Date.now() - cached.lastUpdated < this.CACHE_TTL;
    }

    /**
     * Clear the cache for a user in a server
     */
    public static clearCache(userId: string, serverId?: string): void {
        if (serverId) {
            delete this.cache[userId]?.[serverId];
        } else {
            delete this.cache[userId];
        }
    }

    /**
     * Clear entire permission cache
     */
    public static clearAllCache(): void {
        this.cache = {};
    }
}