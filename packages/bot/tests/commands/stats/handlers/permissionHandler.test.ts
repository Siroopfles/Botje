import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PermissionsBitField } from 'discord.js';
import { PermissionService, Permission } from 'shared';
import { handler } from '../../../../src/commands/stats/handlers/permissionHandler.js';
import { setup, TestContext } from '../../../setup.js';

describe('PermissionHandler', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();

    // Setup default permissions
    Object.defineProperty(ctx.command, 'memberPermissions', {
      value: new PermissionsBitField(['ManageGuild']),
      configurable: true
    });

    // Create base distribution with all permissions set to 0
    const baseDistribution = Object.values(Permission).reduce((acc, perm) => ({
      ...acc,
      [perm]: 0
    }), {} as Record<Permission, number>);

    // Add test values
    const distribution: Record<Permission, number> = {
      ...baseDistribution,
      [Permission.MANAGE_ROLES]: 0.3,
      [Permission.VIEW_ALL_TASKS]: 0.5,
      [Permission.CREATE_TASK]: 0.2,
      [Permission.EDIT_ANY_TASK]: 0.1,
      [Permission.EDIT_OWN_TASK]: 0.4,
      [Permission.DELETE_ANY_TASK]: 0.1,
      [Permission.DELETE_OWN_TASK]: 0.2,
      [Permission.ASSIGN_TASKS]: 0.3,
      [Permission.COMPLETE_ANY_TASK]: 0.2,
      [Permission.COMPLETE_OWN_TASK]: 0.4,
      [Permission.MANAGE_PERMISSIONS]: 0.1,
      [Permission.MANAGE_SERVER_SETTINGS]: 0.1,
      [Permission.MANAGE_NOTIFICATIONS]: 0.2,
      [Permission.SET_NOTIFICATION_CHANNEL]: 0.1,
      [Permission.ASSIGN_ROLES]: 0.2
    };

    // Mock service
    const mockStats = {
      cache: {
        roleEntries: 10,
        permissionEntries: 20
      },
      metrics: {
        totalChecks: 100,
        cacheHitRate: 0.8,
        averageCheckDuration: 0.5,
        checksPerMinute: 60,
        permissionDistribution: distribution,
        grantRate: 0.75
      }
    };

    jest.spyOn(PermissionService, 'getStats').mockReturnValue(mockStats);
  });

  describe('execute', () => {
    it('should show permission statistics', async () => {
      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          title: expect.stringContaining('Permission Statistics'),
          fields: expect.arrayContaining([
            expect.objectContaining({ name: 'Total Users', value: '10' }),
            expect.objectContaining({ name: 'Task Managers', value: expect.any(String) }),
            expect.objectContaining({ name: 'Task Viewers', value: expect.any(String) })
          ])
        })]
      });
    });

    it('should handle reset subcommand', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('reset');
      const clearCacheSpy = jest.spyOn(PermissionService, 'clearAllCache');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(clearCacheSpy).toHaveBeenCalled();
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Permission metrics have been reset'
      });

      // Cleanup
      clearCacheSpy.mockRestore();
    });

    it('should handle missing guild context', async () => {
      // Arrange
      Object.defineProperty(ctx.command, 'guild', {
        value: null,
        configurable: true
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ This command can only be used in a server'
      });
    });

    it('should require manage server permission', async () => {
      // Arrange
      Object.defineProperty(ctx.command, 'memberPermissions', {
        value: new PermissionsBitField([]),
        configurable: true
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ You need the Manage Server permission to view permission statistics'
      });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service error');
      jest.spyOn(PermissionService, 'getStats').mockImplementation(() => {
        throw error;
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to fetch permission statistics: Service error'
      });
    });

    it('should format permission names nicely', async () => {
      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: 'Permission Distribution',
              value: expect.stringMatching(/Manage Roles: .+\nView All Tasks: .+\nCreate Task: .+/),
              inline: true
            })
          ])
        })]
      });
    });
  });
});