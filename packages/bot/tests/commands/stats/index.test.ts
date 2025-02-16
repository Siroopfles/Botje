import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ChatInputCommandInteraction } from 'discord.js';
import { command } from '../../../src/commands/stats/index.js';
import { handlers } from '../../../src/commands/stats/handlers/index.js';
import { setup, TestContext } from '../../setup.js';

describe('Stats Command', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();

    // Mock handlers
    Object.values(handlers).forEach(handler => {
      jest.spyOn(handler, 'execute').mockImplementation(() => Promise.resolve());
    });
  });

  describe('execute', () => {
    it('should delegate to permission handler for permission commands', async () => {
      // Arrange
      ctx.options.getSubcommandGroup.mockReturnValue('permissions');
      ctx.options.getSubcommand.mockReturnValue('view');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(handlers.permission.execute).toHaveBeenCalledWith(ctx.command);
      expect(handlers.tasks.execute).not.toHaveBeenCalled();
      expect(handlers.users.execute).not.toHaveBeenCalled();
    });

    it('should delegate to task handler for task stats', async () => {
      // Arrange
      ctx.options.getSubcommandGroup.mockReturnValue(null);
      ctx.options.getSubcommand.mockReturnValue('tasks');
      ctx.options.getString.mockReturnValue('day');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(handlers.tasks.execute).toHaveBeenCalledWith(ctx.command);
      expect(handlers.permission.execute).not.toHaveBeenCalled();
      expect(handlers.users.execute).not.toHaveBeenCalled();
    });

    it('should delegate to user handler for user stats', async () => {
      // Arrange
      ctx.options.getSubcommandGroup.mockReturnValue(null);
      ctx.options.getSubcommand.mockReturnValue('users');
      ctx.options.getUser.mockReturnValue(ctx.user);

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(handlers.users.execute).toHaveBeenCalledWith(ctx.command);
      expect(handlers.permission.execute).not.toHaveBeenCalled();
      expect(handlers.tasks.execute).not.toHaveBeenCalled();
    });

    describe('permission validation', () => {
      it('should handle missing guild context', async () => {
        // Arrange
        Object.defineProperty(ctx.command, 'guild', {
          value: null,
          configurable: true
        });

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
          content: '❌ This command can only be used in a server'
        });
        expect(handlers.permission.execute).not.toHaveBeenCalled();
        expect(handlers.tasks.execute).not.toHaveBeenCalled();
        expect(handlers.users.execute).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should handle unknown subcommands', async () => {
        // Arrange
        ctx.options.getSubcommandGroup.mockReturnValue(null);
        ctx.options.getSubcommand.mockReturnValue('invalid');

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
          content: '❌ Unknown command'
        });
      });

      it('should handle handler errors gracefully', async () => {
        // Arrange
        const error = new Error('Handler error');
        ctx.options.getSubcommandGroup.mockReturnValue('permissions');
        ctx.options.getSubcommand.mockReturnValue('view');
        jest.spyOn(handlers.permission, 'execute').mockRejectedValue(error);

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
          content: '❌ Failed to fetch statistics: Handler error'
        });
      });
    });

    describe('period validation', () => {
      beforeEach(() => {
        ctx.options.getSubcommandGroup.mockReturnValue(null);
        ctx.options.getSubcommand.mockReturnValue('tasks');
      });

      it('should accept valid periods', async () => {
        // Arrange
        const validPeriods = ['day', 'week', 'month', 'all'];

        for (const period of validPeriods) {
          ctx.options.getString.mockReturnValue(period);

          // Act
          await command.execute(ctx.command);

          // Assert
          expect(handlers.tasks.execute).toHaveBeenCalledWith(ctx.command);
        }
      });

      it('should use "all" as default period', async () => {
        // Arrange
        ctx.options.getString.mockReturnValue(null);

        // Act
        await command.execute(ctx.command);

        // Assert
        expect(handlers.tasks.execute).toHaveBeenCalledWith(ctx.command);
      });
    });
  });
});