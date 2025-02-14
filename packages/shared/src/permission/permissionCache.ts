import { Permission, Role } from '../types/permission.js';

interface CacheEntry<T> {
    value: T;
    timestamp: number;
}

interface PermissionCacheKey {
    userId: string;
    serverId: string;
    permission: Permission;
}

class PermissionCache {
    private static instance: PermissionCache;
    private roleCache: Map<string, CacheEntry<Role[]>> = new Map();
    private permissionCache: Map<string, CacheEntry<boolean>> = new Map();
    private readonly roleTTL = 5 * 60 * 1000; // 5 minutes
    private readonly permissionTTL = 1 * 60 * 1000; // 1 minute

    private constructor() {}

    public static getInstance(): PermissionCache {
        if (!PermissionCache.instance) {
            PermissionCache.instance = new PermissionCache();
        }
        return PermissionCache.instance;
    }

    // Cache key generators
    private getRoleCacheKey(userId: string, serverId: string): string {
        return `${serverId}:${userId}:roles`;
    }

    private getPermissionCacheKey(key: PermissionCacheKey): string {
        return `${key.serverId}:${key.userId}:${key.permission}`;
    }

    // Role caching
    public getCachedRoles(userId: string, serverId: string): Role[] | null {
        const key = this.getRoleCacheKey(userId, serverId);
        const entry = this.roleCache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.roleTTL) {
            this.roleCache.delete(key);
            return null;
        }

        return entry.value;
    }

    public cacheRoles(userId: string, serverId: string, roles: Role[]): void {
        const key = this.getRoleCacheKey(userId, serverId);
        this.roleCache.set(key, {
            value: roles,
            timestamp: Date.now()
        });
    }

    // Permission result caching
    public getCachedPermission(key: PermissionCacheKey): boolean | null {
        const cacheKey = this.getPermissionCacheKey(key);
        const entry = this.permissionCache.get(cacheKey);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.permissionTTL) {
            this.permissionCache.delete(cacheKey);
            return null;
        }

        return entry.value;
    }

    public cachePermission(key: PermissionCacheKey, hasPermission: boolean): void {
        const cacheKey = this.getPermissionCacheKey(key);
        this.permissionCache.set(cacheKey, {
            value: hasPermission,
            timestamp: Date.now()
        });
    }

    // Cache invalidation
    public invalidateUserRoles(userId: string, serverId: string): void {
        const key = this.getRoleCacheKey(userId, serverId);
        this.roleCache.delete(key);
        
        // Also invalidate all permission results for this user in this server
        for (const [permKey] of this.permissionCache) {
            if (permKey.startsWith(`${serverId}:${userId}:`)) {
                this.permissionCache.delete(permKey);
            }
        }
    }

    public invalidateServerRoles(serverId: string): void {
        // Remove all role entries for this server
        for (const [key] of this.roleCache) {
            if (key.startsWith(`${serverId}:`)) {
                this.roleCache.delete(key);
            }
        }

        // Remove all permission entries for this server
        for (const [key] of this.permissionCache) {
            if (key.startsWith(`${serverId}:`)) {
                this.permissionCache.delete(key);
            }
        }
    }

    // Cache maintenance
    public cleanup(): void {
        const now = Date.now();

        // Clean expired role entries
        for (const [key, entry] of this.roleCache) {
            if (now - entry.timestamp > this.roleTTL) {
                this.roleCache.delete(key);
            }
        }

        // Clean expired permission entries
        for (const [key, entry] of this.permissionCache) {
            if (now - entry.timestamp > this.permissionTTL) {
                this.permissionCache.delete(key);
            }
        }
    }

    public clear(): void {
        this.roleCache.clear();
        this.permissionCache.clear();
    }

    // Cache stats
    public getStats() {
        return {
            roleEntries: this.roleCache.size,
            permissionEntries: this.permissionCache.size
        };
    }
}

export const permissionCache = PermissionCache.getInstance();