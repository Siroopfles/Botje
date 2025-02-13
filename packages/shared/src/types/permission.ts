export enum Permission {
    // Task Management
    CREATE_TASK = 'CREATE_TASK',
    EDIT_ANY_TASK = 'EDIT_ANY_TASK',
    EDIT_OWN_TASK = 'EDIT_OWN_TASK',
    DELETE_ANY_TASK = 'DELETE_ANY_TASK',
    DELETE_OWN_TASK = 'DELETE_OWN_TASK',
    VIEW_ALL_TASKS = 'VIEW_ALL_TASKS',
    ASSIGN_TASKS = 'ASSIGN_TASKS',
    COMPLETE_ANY_TASK = 'COMPLETE_ANY_TASK',
    COMPLETE_OWN_TASK = 'COMPLETE_OWN_TASK',

    // Settings Management
    MANAGE_SERVER_SETTINGS = 'MANAGE_SERVER_SETTINGS',
    MANAGE_NOTIFICATIONS = 'MANAGE_NOTIFICATIONS',
    MANAGE_ROLES = 'MANAGE_ROLES',
    MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',

    // Channel Management
    SET_NOTIFICATION_CHANNEL = 'SET_NOTIFICATION_CHANNEL',
    
    // Role Management
    ASSIGN_ROLES = 'ASSIGN_ROLES',

    // User Management
    MANAGE_USERS = 'MANAGE_USERS'
}

export interface Role {
    id?: string;
    name: string;
    serverId: string;
    permissions: Permission[];
    assignableBy: Permission[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserRole {
    id?: string;
    userId: string;
    serverId: string;
    roleId: string;
    assignedBy: string;
    assignedAt: Date;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

// Default role configurations
export const DEFAULT_ADMIN_PERMISSIONS = Object.values(Permission);

export const DEFAULT_MODERATOR_PERMISSIONS = [
    Permission.CREATE_TASK,
    Permission.EDIT_ANY_TASK,
    Permission.DELETE_ANY_TASK,
    Permission.VIEW_ALL_TASKS,
    Permission.ASSIGN_TASKS,
    Permission.COMPLETE_ANY_TASK,
    Permission.MANAGE_NOTIFICATIONS,
    Permission.SET_NOTIFICATION_CHANNEL
];

export const DEFAULT_USER_PERMISSIONS = [
    Permission.CREATE_TASK,
    Permission.EDIT_OWN_TASK,
    Permission.DELETE_OWN_TASK,
    Permission.VIEW_ALL_TASKS,
    Permission.COMPLETE_OWN_TASK
];

// Helper functions for permission checks
export function hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
}

// Role helpers
export function createDefaultRoles(serverId: string): Role[] {
    return [
        {
            name: 'Admin',
            serverId,
            permissions: DEFAULT_ADMIN_PERMISSIONS,
            assignableBy: [Permission.MANAGE_ROLES]
        },
        {
            name: 'Moderator',
            serverId,
            permissions: DEFAULT_MODERATOR_PERMISSIONS,
            assignableBy: [Permission.MANAGE_ROLES]
        },
        {
            name: 'User',
            serverId,
            permissions: DEFAULT_USER_PERMISSIONS,
            assignableBy: [Permission.ASSIGN_ROLES]
        }
    ];
}