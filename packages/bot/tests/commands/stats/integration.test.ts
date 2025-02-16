import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  ChatInputCommandInteraction, 
  PermissionsBitField, 
  User 
} from 'discord.js';
import { PermissionService, Permission } from 'shared';
import { command } from '../../../src/commands/stats/index.js';
import { handlers } from '../../../src/commands/stats/handlers/index.js';
import { setup, TestContext } from '../../setup.js';

describe('Stats Command Integration', () => {
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

    // Mock handlers
    Object.values(handlers).forEach(handler => {
      jest.spyOn(handler, 'execute').mockImplementation(() => Promise.resolve());
    });

    // Mock service
    jest.spyOn(PermissionService, 'getStats').mockReturnValue({
      cache: {
        roleEntries: 10,
        permissionEntries: 20
      },
      metrics: {
        totalChecks: 100,
        cacheHitRate: 0.8,
        averageCheckDuration: 0.5,
        checksPerMinute: 60,
        permissionDistribution: baseDistribution,
        grantRate: 0.75
      }
    });

    jest.spyOn(PermissionService, 'clearAllCache').mockImplementation(() => undefined);
  });

  describe('full command flows', () => {
    describe('permission stats', () => {
      it('should handle view flow', async () => {
        // Arrange
        ctx.options.getSubcommandGroup.mockReturnValue('permissions');
        ctx.options.getSubcommand.mockReturnValue('view');

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(handlers.permission.execute).toHaveBeenCalled();
        expect(PermissionService.getStats).toHaveBeenCalled();
      });

      it('should handle reset flow', async () => {
        // Arrange
        ctx.options.getSubcommandGroup.mockReturnValue('permissions');
        ctx.options.getSubcommand.mockReturnValue('reset');

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(handlers.permission.execute).toHaveBeenCalled();
        expect(PermissionService.clearAllCache).toHaveBeenCalled();
      });
    });

    describe('task stats', () => {
      it('should handle period-based views', async () => {
        // Arrange
        const periods = ['day', 'week', 'month', 'all'];
        
        for (const period of periods) {
          ctx.options.getSubcommandGroup.mockReturnValue(null);
          ctx.options.getSubcommand.mockReturnValue('tasks');
          ctx.options.getString.mockReturnValue(period);

          // Act
          await command.execute(ctx.command);

          // Assert
          expect(handlers.tasks.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              options: expect.objectContaining({
                getString: expect.any(Function)
              })
            })
          );
        }
      });
    });

    describe('user stats', () => {
      it('should handle self view', async () => {
        // Arrange
        ctx.options.getSubcommandGroup.mockReturnValue(null);
        ctx.options.getSubcommand.mockReturnValue('users');
        ctx.options.getUser.mockReturnValue(null);

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(handlers.users.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            user: ctx.user
          })
        );
      });

      it('should handle target user view', async () => {
        // Arrange
        const targetUser = {
          id: 'target-123',
          tag: 'target#0000',
          toString: () => '<@target-123>'
        } as unknown as User;

        ctx.options.getSubcommandGroup.mockReturnValue(null);
        ctx.options.getSubcommand.mockReturnValue('users');
        ctx.options.getUser.mockReturnValue(targetUser);

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(handlers.users.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              getUser: expect.any(Function)
            })
          })
        );
      });
    });
  });

  describe('error handling', () => {
    it('should propagate and handle service errors', async () => {
      // Arrange
      const serviceError = new Error('Service failure');
      const mockGetStats = jest.spyOn(PermissionService, 'getStats').mockImplementation(() => {
        throw serviceError;
      });

      ctx.options.getSubcommandGroup.mockReturnValue('permissions');
      ctx.options.getSubcommand.mockReturnValue('view');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Service failure')
      });

      // Cleanup
      mockGetStats.mockRestore();
    });

    it('should handle failed handler execution', async () => {
      // Arrange
      const handlerError = new Error('Handler failure');
      const mockExecute = jest.spyOn(handlers.tasks, 'execute').mockImplementation(async () => {
        throw handlerError;
      });

      ctx.options.getSubcommandGroup.mockReturnValue(null);
      ctx.options.getSubcommand.mockReturnValue('tasks');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Handler failure')
      });

      // Cleanup
      mockExecute.mockRestore();
    });
  });
});