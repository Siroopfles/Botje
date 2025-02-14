import { Permission, Role, UserRole, hasPermission } from '../types/permission.js';
import { permissionCache } from './permissionCache.js';
import { permissionMetrics } from './permissionMetrics.js';

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

export class PermissionService {
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
        const startTime = Date.now();
        let cacheHit = false;
        let result = false;

        try {
            // Check permission cache first
            if (!options.ignoreCache) {
                const cached = permissionCache.getCachedPermission({ userId, serverId, permission });
                if (cached !== null) {
                    cacheHit = true;
                    result = cached;
                    return result;
                }
            }

            // Get user permissions and check
            const userPermissions = await this.getUserPermissions(
                userId,
                serverId,
                roleRepo,
                userRoleRepo,
                options
            );
            
            result = hasPermission(userPermissions, permission);

            // Cache the result
            if (!options.ignoreCache) {
                permissionCache.cachePermission({ userId, serverId, permission }, result);
            }

            return result;
        } finally {
            // Record metrics
            permissionMetrics.recordCheck({
                timestamp: startTime,
                userId,
                serverId,
                permission,
                duration: Date.now() - startTime,
                cacheHit,
                granted: result
            });
        }
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
        // Get roles first (they might be cached)
        const roles = await this.getUserRoles(userId, serverId, roleRepo, userRoleRepo, options);
        
        // Combine permissions from all roles
        const permissions = new Set<Permission>();
        roles.forEach(role => {
            role.permissions.forEach(p => permissions.add(p));
        });

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
        if (!options.ignoreCache) {
            const cached = permissionCache.getCachedRoles(userId, serverId);
            if (cached !== null) {
                return cached;
            }
        }

        // Get user's roles from database
        const userRoles = await userRoleRepo.findByUser(userId, serverId);
        const roles = await Promise.all(
            userRoles.map(ur => roleRepo.findById(ur.roleId))
        );

        // Filter out null values and cache
        const validRoles = roles.filter((r): r is Role => r !== null);
        if (!options.ignoreCache) {
            permissionCache.cacheRoles(userId, serverId, validRoles);
        }

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
        const startTime = Date.now();
        let result = false;

        try {
            const role = await roleRepo.findById(roleId);
            if (!role) {
                return false;
            }

            const userPermissions = await this.getUserPermissions(userId, serverId, roleRepo, userRoleRepo);
            result = role.assignableBy.some(permission => hasPermission(userPermissions, permission));
            return result;
        } finally {
            // Record metrics for role assignment checks
            permissionMetrics.recordCheck({
                timestamp: startTime,
                userId,
                serverId,
                permission: Permission.ASSIGN_ROLES,
                duration: Date.now() - startTime,
                cacheHit: false, // Role assignment always checks fresh
                granted: result
            });
        }
    }

    /**
     * Clear cached data for a user in a server
     */
    public static clearCache(userId: string, serverId?: string): void {
        if (serverId) {
            permissionCache.invalidateUserRoles(userId, serverId);
        } else {
            // If no serverId, clear all servers for this user
            // This is a bit inefficient but safer
            const stats = permissionCache.getStats();
            // Clear and let it rebuild as needed
            permissionCache.clear();
        }
    }

    /**
     * Clear all cached permission data
     */
    public static clearAllCache(): void {
        permissionCache.clear();
    }

    /**
     * Get permission system statistics
     */
    public static getStats() {
        return {
            cache: permissionCache.getStats(),
            metrics: permissionMetrics.getStats()
        };
    }
}