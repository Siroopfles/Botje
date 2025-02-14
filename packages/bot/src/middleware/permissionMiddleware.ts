import { ChatInputCommandInteraction } from 'discord.js';
import { Permission, PermissionService, Role } from 'shared';
import { 
    createRoleRepository,
    createUserRoleRepository,
    createTaskRepository
} from 'database';

const roleRepo = createRoleRepository();
const userRoleRepo = createUserRoleRepository();
const taskRepo = createTaskRepository();

// Map of command names to required permissions
const COMMAND_PERMISSIONS: { [key: string]: Permission[] } = {
    // Task commands
    'task create': [Permission.CREATE_TASK],
    'task edit': [Permission.EDIT_ANY_TASK, Permission.EDIT_OWN_TASK],
    'task delete': [Permission.DELETE_ANY_TASK, Permission.DELETE_OWN_TASK],
    'task list': [Permission.VIEW_ALL_TASKS],
    'task complete': [Permission.COMPLETE_ANY_TASK, Permission.COMPLETE_OWN_TASK],

    // Settings commands
    'settings': [Permission.MANAGE_SERVER_SETTINGS],
    'roles': [Permission.MANAGE_ROLES],
    'roles init': [Permission.MANAGE_ROLES],
    'roles list': [Permission.VIEW_ALL_TASKS], // Anyone who can view tasks can view roles
    'roles create': [Permission.MANAGE_ROLES],
    'roles delete': [Permission.MANAGE_ROLES],
    'roles assign': [Permission.ASSIGN_ROLES],
    'usersettings': [], // No permissions needed for personal settings
};

/**
 * Check if user has permission to execute a command
 */
export async function checkPermissions(
    interaction: ChatInputCommandInteraction
): Promise<boolean> {
    const command = interaction.commandName;
    const subcommand = interaction.options.getSubcommand(false);
    const fullCommand = subcommand ? `${command} ${subcommand}` : command;

    // Get required permissions
    const requiredPermissions = COMMAND_PERMISSIONS[fullCommand];
    
    // If no permissions defined, allow command
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
    }

    // Server owner bypass - always has permission
    const guild = interaction.guild;
    if (guild && guild.ownerId === interaction.user.id) {
        return true;
    }

    // For task edit/delete/complete commands, check if user is the assignee
    if (command === 'task' && ['edit', 'delete', 'complete'].includes(subcommand || '')) {
        const taskId = interaction.options.getString('task-id');
        if (taskId) {
            const task = await taskRepo.findById(taskId);
            if (task?.assigneeId === interaction.user.id) {
                const ownPermission = requiredPermissions.find(p => p.includes('OWN_'));
                if (ownPermission) {
                    const hasPermission = await PermissionService.hasPermission(
                        interaction.user.id,
                        interaction.guildId!,
                        ownPermission,
                        roleRepo,
                        userRoleRepo
                    );
                    if (hasPermission) {
                        return true;
                    }
                }
            }
        }
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
        const hasPermission = await PermissionService.hasPermission(
            interaction.user.id,
            interaction.guildId!,
            permission,
            roleRepo,
            userRoleRepo
        );

        if (hasPermission) {
            return true;
        }
    }

    // If user has no required permissions, deny access
    await interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
    });
    return false;
}

/**
 * Get user's effective permissions
 */
export async function getUserPermissions(
    userId: string,
    serverId: string
): Promise<Permission[]> {
    return PermissionService.getUserPermissions(
        userId,
        serverId,
        roleRepo,
        userRoleRepo
    );
}

/**
 * Get user's roles
 */
export async function getUserRoles(
    userId: string,
    serverId: string
): Promise<string[]> {
    const roles = await PermissionService.getUserRoles(
        userId,
        serverId,
        roleRepo,
        userRoleRepo
    );
    return roles.map((r: Role) => r.name);
}