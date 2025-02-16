import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DeleteHandler } from '../../../../src/commands/roles/handlers/deleteHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockRoleRepo } from '../../../mocks/database.js';
import { Permission, Role, UserRole } from 'shared';
import * as roleEvents from '../../../../src/events/roleEvents.js';
import { UserRoleRepository } from 'database';
import type { Role as DiscordRole, Collection, GuildMemberRoleManager, RoleManager } from 'discord.js';

jest.mock('../../../../src/events/roleEvents.js');
jest.mock('database');

// Mock UserRoleRepository since it's not exported from database mocks
const mockUserRoleRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    findByRole: jest.fn(),
    findByServer: jest.fn(),
    delete: jest.fn(),
    deleteByUserAndRole: jest.fn(),
    getExpiredRoles: jest.fn()
} as jest.Mocked<UserRoleRepository>;

// Ensure createUserRoleRepository returns our mock
(jest.requireActual('database') as any).createUserRoleRepository = () => mockUserRoleRepo;

describe('DeleteHandler', () => {
    const handler = new DeleteHandler();
    let ctx: TestContext;

    const roleId = 'role-123';
    const discordRoleId = 'discord-role-123';
    
    beforeEach(() => {
        ctx = setup();
        jest.clearAllMocks();
        
        // Mock role events with serverId parameter
        jest.spyOn(roleEvents, 'startRoleInitialization').mockImplementation((serverId: string) => {});
        jest.spyOn(roleEvents, 'finishRoleInitialization').mockImplementation((serverId: string) => {});

        // Setup default role-id input
        ctx.options.getString.mockReturnValue(roleId);
        
        // Mock Discord role with properly typed delete method
        const mockDiscordRole = {
            id: discordRoleId,
            name: 'Test Role',
            delete: jest.fn().mockImplementation(() => Promise.resolve({} as DiscordRole))
        };

        // Setup guild.roles.fetch mock with proper typing
        const mockRoleManager = {
            fetch: jest.fn().mockImplementation(() => Promise.resolve(mockDiscordRole))
        };

        ctx.guild.roles = mockRoleManager as unknown as RoleManager;
    });

    it('should handle role not found', async () => {
        // Arrange
        mockRoleRepo.findById.mockResolvedValue(null);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith('❌ Role not found');
        expect(mockUserRoleRepo.findByRole).not.toHaveBeenCalled();
        expect(mockRoleRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle role from different server', async () => {
        // Arrange
        const mockRole = {
            id: roleId,
            name: 'Test Role',
            serverId: 'different-server',
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            createdAt: new Date(),
            updatedAt: new Date()
        } as const;
        mockRoleRepo.findById.mockImplementation(() => Promise.resolve(mockRole as any));

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith('❌ This role belongs to a different server');
        expect(mockUserRoleRepo.findByRole).not.toHaveBeenCalled();
        expect(mockRoleRepo.delete).not.toHaveBeenCalled();
    });

    it('should delete role and associated data', async () => {
        // Arrange
        const mockRole = {
            id: roleId,
            name: 'Test Role',
            serverId: ctx.guild.id,
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            discordRoleId,
            createdAt: new Date(),
            updatedAt: new Date()
        } as const;
        mockRoleRepo.findById.mockImplementation(() => Promise.resolve(mockRole as any));
        
        const mockUserRoles = [
            { id: 'user-role-1' } as const,
            { id: 'user-role-2' } as const
        ];
        mockUserRoleRepo.findByRole.mockImplementation(() => Promise.resolve(mockUserRoles as any));
        mockUserRoleRepo.delete.mockResolvedValue(true);
        mockRoleRepo.delete.mockResolvedValue(true);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(roleEvents.startRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
        expect(mockUserRoleRepo.findByRole).toHaveBeenCalledWith(roleId);
        expect(mockUserRoleRepo.delete).toHaveBeenCalledTimes(2);
        expect(mockUserRoleRepo.delete).toHaveBeenCalledWith('user-role-1');
        expect(mockUserRoleRepo.delete).toHaveBeenCalledWith('user-role-2');
        expect(ctx.guild.roles.fetch).toHaveBeenCalledWith(discordRoleId);
        expect(mockRoleRepo.delete).toHaveBeenCalledWith(roleId);
        expect(ctx.methods.editReply).toHaveBeenCalledWith('✅ Deleted role "Test Role"');
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });

    it('should handle non-existent Discord role', async () => {
        // Arrange
        const mockRole = {
            id: roleId,
            name: 'Test Role',
            serverId: ctx.guild.id,
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            discordRoleId,
            createdAt: new Date(),
            updatedAt: new Date()
        } as const;
        mockRoleRepo.findById.mockImplementation(() => Promise.resolve(mockRole as any));
        (ctx.guild.roles.fetch as jest.Mock).mockImplementation(() => Promise.resolve(null));
        mockRoleRepo.delete.mockResolvedValue(true);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith('✅ Deleted role "Test Role"');
    });

    it('should handle database deletion failure', async () => {
        // Arrange
        const mockRole = {
            id: roleId,
            name: 'Test Role',
            serverId: ctx.guild.id,
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            createdAt: new Date(),
            updatedAt: new Date()
        } as const;
        mockRoleRepo.findById.mockImplementation(() => Promise.resolve(mockRole as any));
        mockRoleRepo.delete.mockResolvedValue(false);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith('❌ Failed to delete role');
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });

    it('should handle user role deletion error', async () => {
        // Arrange
        const mockRole = {
            id: roleId,
            name: 'Test Role',
            serverId: ctx.guild.id,
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            createdAt: new Date(),
            updatedAt: new Date()
        } as const;
        mockRoleRepo.findById.mockImplementation(() => Promise.resolve(mockRole as any));
        mockUserRoleRepo.findByRole.mockImplementation(() => Promise.reject(new Error('Database error')));

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith('❌ Failed to delete role');
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });

    it('should handle Discord role deletion error', async () => {
        // Arrange
        const mockRole = {
            id: roleId,
            name: 'Test Role',
            serverId: ctx.guild.id,
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            discordRoleId,
            createdAt: new Date(),
            updatedAt: new Date()
        } as const;
        mockRoleRepo.findById.mockImplementation(() => Promise.resolve(mockRole as any));
        
        const mockDiscordRole = {
            id: discordRoleId,
            name: 'Test Role',
            delete: jest.fn().mockImplementation(() => Promise.reject(new Error('Discord API error')))
        };
        (ctx.guild.roles.fetch as jest.Mock).mockImplementation(() => Promise.resolve(mockDiscordRole));

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith('❌ Failed to delete role');
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });
});