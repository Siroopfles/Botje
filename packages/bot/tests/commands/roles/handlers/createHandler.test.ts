import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CreateHandler } from '../../../../src/commands/roles/handlers/createHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockRoleRepo } from '../../../mocks/database.js';
import { Permission, Role } from 'shared';
import * as roleUtils from '../../../../src/commands/roles/utils.js';
import * as roleEvents from '../../../../src/events/roleEvents.js';
import { RoleDocument } from 'database';

jest.mock('../../../../src/commands/roles/utils.js');
jest.mock('../../../../src/events/roleEvents.js');

describe('CreateHandler', () => {
    const handler = new CreateHandler();
    let ctx: TestContext;

    const validName = 'Test Role';
    const validPermissions = `${Permission.CREATE_TASK},${Permission.VIEW_ALL_TASKS}`;
    const discordRoleId = 'discord-role-123';

    beforeEach(() => {
        ctx = setup();
        jest.clearAllMocks();
        
        // Mock role creation utilities
        jest.spyOn(roleUtils, 'createDiscordRole').mockResolvedValue(discordRoleId);
        jest.spyOn(roleEvents, 'startRoleInitialization').mockImplementation(jest.fn());
        jest.spyOn(roleEvents, 'finishRoleInitialization').mockImplementation(jest.fn());

        // Setup default valid inputs
        ctx.options.getString
            .mockReturnValueOnce(validName)  // name
            .mockReturnValueOnce(validPermissions);  // permissions
    });

    it('should handle invalid permissions', async () => {
        // Arrange
        ctx.options.getString
            .mockReturnValueOnce(validName)
            .mockReturnValueOnce('INVALID_PERM,OTHER_INVALID');

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining('❌ Invalid permissions')
        });
        expect(mockRoleRepo.create).not.toHaveBeenCalled();
    });

    it('should create role with valid inputs', async () => {
        // Arrange
        const expectedPermissions = [Permission.CREATE_TASK, Permission.VIEW_ALL_TASKS];
        const mockRole: Role = {
            id: 'role-123',
            name: validName,
            serverId: ctx.guild.id,
            permissions: expectedPermissions,
            assignableBy: [Permission.MANAGE_ROLES],
            discordRoleId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        mockRoleRepo.create.mockResolvedValue(mockRole as unknown as RoleDocument);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(roleEvents.startRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
        expect(roleUtils.createDiscordRole).toHaveBeenCalledWith(ctx.guild, {
            name: validName,
            serverId: ctx.guild.id,
            permissions: expectedPermissions,
            assignableBy: [Permission.MANAGE_ROLES]
        });
        expect(mockRoleRepo.create).toHaveBeenCalledWith({
            name: validName,
            serverId: ctx.guild.id,
            permissions: expectedPermissions,
            assignableBy: [Permission.MANAGE_ROLES],
            discordRoleId
        });
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
            content: `✅ Created role "${mockRole.name}" with ID: ${mockRole.id}`
        });
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });

    it('should handle Discord role creation failure', async () => {
        // Arrange
        const error = new Error('Discord API error');
        jest.spyOn(roleUtils, 'createDiscordRole').mockRejectedValue(error);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(mockRoleRepo.create).not.toHaveBeenCalled();
        expect(ctx.methods.editReply).toHaveBeenCalledWith(
            '❌ Failed to create role. It might already exist.'
        );
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });

    it('should handle database creation failure', async () => {
        // Arrange
        const error = new Error('Database error');
        mockRoleRepo.create.mockRejectedValue(error);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith(
            '❌ Failed to create role. It might already exist.'
        );
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });

    it('should validate empty permissions', async () => {
        // Arrange
        ctx.options.getString
            .mockReturnValueOnce(validName)
            .mockReturnValueOnce('');

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining('❌ Invalid permissions')
        });
        expect(mockRoleRepo.create).not.toHaveBeenCalled();
    });

    it('should ensure role initialization is finished even when creation succeeds', async () => {
        // Arrange
        const mockRole: Role = {
            id: 'role-123',
            name: validName,
            serverId: ctx.guild.id,
            permissions: [Permission.CREATE_TASK],
            assignableBy: [Permission.MANAGE_ROLES],
            discordRoleId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        mockRoleRepo.create.mockResolvedValue(mockRole as unknown as RoleDocument);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(roleEvents.finishRoleInitialization).toHaveBeenCalledWith(ctx.guild.id);
    });
});